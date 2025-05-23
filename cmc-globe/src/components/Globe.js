// Globe.js
// This component renders the interactive 3D globe using Three.js.
// It includes the main sphere, instanced hexagonal dots on land masses,
// lighting, and animation.

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  generateLatLonGrid,
  sampleLandMask,
  latLonToCartesian,
  assignDotsToRegions,
  calculateRegionCentroids,
  countryToRegion, // Added for blacklist overlay
  regionDefinitions // Added to initialize overlay counts
} from '../utils/geoUtils';

const Globe = ({ countryUpdate }) => { // Changed to single countryUpdate prop
  const mountRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // Target number of points to generate across the sphere before filtering by land mask.
  // This number directly impacts performance and visual density.
  const NUM_POINTS_TO_GENERATE = 400000; 

  // dotIdMap stores metadata for each dot, accessible by a unique ID.
  // Using useRef to persist this map across re-renders without triggering them.
  const dotIdMap = useRef({});
  const regionDotsMap = useRef({});
  const regionCentroidsMap = useRef({});
  const regionOverlayCounts = useRef({}); // Added: To store blacklist counts for regions
  const instancedDotsMeshRef = useRef(null); // Added: Ref to access instanced mesh
  const globeSphereRef = useRef(null); // Ref for the globe sphere mesh
  const activeArcsRef = useRef([]); // To keep track of active arc meshes
  const sceneRef = useRef(null); // Ref for the scene

  // User-set camera Z position (as per last explicit user setting)
  const INITIAL_CAMERA_Z = 1.9;

  useEffect(() => {
    // This effect hook sets up the Three.js scene, renderer, camera, objects, and animation loop.
    // It runs once after the component mounts.

    // WebSocket connection URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:4444`;
    let websocket = null;

    if (!mountRef.current) {
      // Ensure the mount point is available before proceeding.
      return;
    }

    let animationFrameId; // To store the ID from requestAnimationFrame for cleanup
    const scene = new THREE.Scene();

    // --- State for interaction ---
    let isDragging = false;
    let previousMousePosition = {
      x: 0,
      y: 0
    };

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75, // Field of View (FOV)
      mountRef.current.clientWidth / mountRef.current.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    camera.position.z = INITIAL_CAMERA_Z;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, // Enable anti-aliasing for smoother edges
      alpha: true      // Allow transparency for the canvas background
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight); // Match canvas size to container
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust for device pixel ratio for sharpness
    mountRef.current.appendChild(renderer.domElement); // Add canvas to the DOM

    // --- Main Globe Sphere ---
    const globeGeometry = new THREE.SphereGeometry(
      1,  // Radius
      64, // Width segments (higher for smoother sphere)
      64  // Height segments
    );
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: 0x9000ff, // Original purple color
      metalness: 0.8,  // Low metalness to reduce sharp specular highlights
      roughness: 0.8,  // High roughness for diffuse shading
    });
    // const globeSphere = new THREE.Mesh(globeGeometry, globeMaterial);
    globeSphereRef.current = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globeSphereRef.current); // Add directly to scene
    sceneRef.current = scene; // Store scene in ref
    
    // --- Lighting Setup ---
    // Ambient light: provides overall, non-directional illumination.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);
    
    // Hemisphere light: simulates sky and ground light.
    const hemisphereLight = new THREE.HemisphereLight(
      0xffffff, // Sky color
      0x333333, // Ground color
      4      
    );
    scene.add(hemisphereLight); 

    // Add a DirectionalLight as a child of the globeSphere to create a
    // top-left highlight that is "attached" to the globe and rotates with it (if globe spins).
    const attachedGradientLight = new THREE.DirectionalLight(0xffffff, 0.9); // Adjust intensity
    // Position in globe's local space to hit its "top-left" quadrant.
    // Imagine the globe's local axes: +Y up, +X right, +Z towards camera (if no rotation).
    // Light from (-X, +Y, +Z) direction.
    attachedGradientLight.position.set(-2, 3, 1).normalize(); // Normalize for direction
    globeSphereRef.current.add(attachedGradientLight); 
    // By default, a directional light targets (0,0,0) in its parent's coordinate system.
    // Since globeSphereRef.current is at world origin, this light will target the globe's center.

    // --- Background Glow Sprite ---
    // (This is the glow BEHIND the globe)
    const createGlowTexture = (size = 256, glowColor = 'rgba(72, 0, 255, 0.9)') => { // Increased alpha in glowColor
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return null;

      // Create a radial gradient: inner (glowColor) to outer (transparent)
      const gradient = context.createRadialGradient(
        size / 2, size / 2, 0, 
        size / 2, size / 2, size / 2  
      );
      // Controls the spread and color of the background glow
      gradient.addColorStop(0.0, glowColor); // Inner color of the glow
      gradient.addColorStop(0.2, glowColor); // Inner color of the glow
      gradient.addColorStop(1, 'rgba(170, 136, 255, 0)');   // Outer edge (transparent)

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      return new THREE.CanvasTexture(canvas);
    };

    const glowTexture = createGlowTexture();
    
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.3, // Increased opacity of the background glow
      blending: THREE.AdditiveBlending, 
      depthWrite: false, 
    });
    
    const glowSprite = new THREE.Sprite(glowMaterial);
    const baseGlowScale = 3; // This is the scale relative to the globe's radius (1)
    glowSprite.scale.set(baseGlowScale, baseGlowScale, 1); 
    // Position in local space of globeSphereRef.current, slightly behind its surface.
    glowSprite.position.set(0, 0, -0.01); // z = -0.01 to be just behind globe surface
    globeSphereRef.current.add(glowSprite); // Add glowSprite as a child of globeSphereRef.current

    // --- Instanced Hexagonal Dots ---
    // Define geometry for a single hexagonal dot (a flat cylinder).
    // Revert to original size
    const dotRadius = 0.001; 
    const dotHeight = 0.001; 
    const dotGeometry = new THREE.CylinderGeometry(dotRadius, dotRadius, dotHeight, 6); // 6 sides for hexagon
    // Material for the dots - changed to pure white.
    // Enable vertexColors for per-instance coloring
    // Using MeshBasicMaterial to ensure color is shown regardless of lighting
    const dotMaterial = new THREE.MeshBasicMaterial({ 
      vertexColors: true // Re-enable vertexColors
    });
    
    // let instancedDotsMesh; // This will hold the InstancedMesh object for all dots.
    // instancedDotsMesh will now be accessed via instancedDotsMeshRef.current

    // Initialize regionOverlayCounts
    Object.keys(regionDefinitions).forEach(regionName => {
      regionOverlayCounts.current[regionName] = 0;
    });
    if (!regionOverlayCounts.current["Undefined"]) {
        regionOverlayCounts.current["Undefined"] = 0;
    }

    // Load initial blacklist from localStorage and set initial overlay counts
    if (typeof window !== 'undefined') {
      const storedBlacklist = JSON.parse(localStorage.getItem('globeAppBlacklist') || '[]');
      const initialCounts = {};
      Object.keys(regionDefinitions).forEach(rName => { initialCounts[rName] = 0; });
      if (!initialCounts["Undefined"]) initialCounts["Undefined"] = 0;

      storedBlacklist.forEach(country => {
        const regionName = countryToRegion[country.id];
        if (regionName) {
          initialCounts[regionName] = (initialCounts[regionName] || 0) + 1;
        }
      });
      regionOverlayCounts.current = initialCounts;
      console.log("Globe.js: Initialized regionOverlayCounts from localStorage:", regionOverlayCounts.current);
    }


    // Asynchronous function to generate points, filter by land mask, and create instanced dots.
    const loadDots = async () => {
      setIsLoading(true); // Show loading indicator
      console.log(`Generating ${NUM_POINTS_TO_GENERATE} initial points for InstancedMesh...`);
      const initialPoints = generateLatLonGrid(NUM_POINTS_TO_GENERATE);
      console.log(`Generated ${initialPoints.length} initial points.`);
      
      console.log("Sampling land mask to filter points for InstancedMesh...");
      try {
        // Filter points to include only those on land areas using the land-mask.png image.
        const landPoints = await sampleLandMask(initialPoints, '/land-mask.png');
        console.log(`Filtered to ${landPoints.length} land points for InstancedMesh.`);

        if (landPoints.length === 0) {
          console.warn("No land points found after sampling. Check land-mask.png, its content, and sampling logic in geoUtils.js.");
          setIsLoading(false);
          return; // Exit if no points to render
        }

        // Create an InstancedMesh for all land points. This is highly performant for many identical objects.
        // instancedDotsMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, landPoints.length);
        instancedDotsMeshRef.current = new THREE.InstancedMesh(dotGeometry, dotMaterial, landPoints.length);
        // Ensure instanceColor is available. If not, Three.js might not have created it.
        
        const numInstances = landPoints.length;
        instancedDotsMeshRef.current = new THREE.InstancedMesh(dotGeometry, dotMaterial, numInstances);
        
        // --- Manual Color Attribute Setup ---
        const colorArray = new Float32Array(numInstances * 3);
        const baseDotColorForInit = new THREE.Color(0xffffff);
        const overlayColorForInit = new THREE.Color(0xff0000);

        landPoints.forEach((point, index) => { // Iterate through points to assign initial colors based on pre-calculated region counts
          const dotIdForInit = index + 1; // Assuming dotIdMap isn't populated yet here, use index
          // Need to determine region for this point to apply initial overlay
          // This requires lat/lon to be available for each point before this loop,
          // or assignDotsToRegions to be called earlier.
          // For simplicity, let's assume dotIdMap will be populated with region info before this color setting.
          // This part is tricky because dotIdMap is populated *after* this loop.
          // Let's set all to white initially, then apply overlays in a separate pass or via countryUpdate.
          // The current countryUpdate effect will handle initial coloring from MenuPanel's storedBlacklist.
          baseDotColorForInit.toArray(colorArray, index * 3);
        });
        
        instancedDotsMeshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
        console.log("Manually added 'color' InstancedBufferAttribute, all set to white initially.");

        const dummyMatrixObject = new THREE.Object3D();

        landPoints.forEach((point, index) => {
          const { x, y, z } = latLonToCartesian(point.lat, point.lon, 1.005);
          
          dummyMatrixObject.position.set(x, y, z);
          dummyMatrixObject.lookAt(0,0,0); 
          dummyMatrixObject.rotateX(Math.PI / 2);
          
          dummyMatrixObject.updateMatrix();
          instancedDotsMeshRef.current.setMatrixAt(index, dummyMatrixObject.matrix);

          const dotId = index + 1; // This is the actual dotId
          dotIdMap.current[dotId] = {
            lat: point.lat,
            lon: point.lon,
            instanceIndex: index,
            x, y, z
            // Region will be added by assignDotsToRegions
          };
        });

        instancedDotsMeshRef.current.instanceMatrix.needsUpdate = true;
        // The 'color' attribute also needs to be marked for update if changed later.
        // For initial setup, it's part of the geometry.
        // instancedDotsMeshRef.current.geometry.getAttribute('color').needsUpdate = true; // This is done when colors change.
        
        globeSphereRef.current.add(instancedDotsMeshRef.current); // Add dots as a child of globeSphereRef.current
        
        // --- Region Assignment and Centroid Calculation ---
        if (Object.keys(dotIdMap.current).length > 0) {
          console.log("Assigning dots to regions...");
          const assignedRegionDots = assignDotsToRegions(dotIdMap.current); // This adds .region to dotIdMap items
          regionDotsMap.current = assignedRegionDots;
          console.log("Dots assigned to regions:", regionDotsMap.current);

          // Apply initial overlay colors based on localStorage counts
          const colorAttribute = instancedDotsMeshRef.current.geometry.getAttribute('color');
          if (colorAttribute && Object.keys(regionOverlayCounts.current).length > 0) {
            console.log("Globe.js: Applying initial overlay colors from localStorage counts.");
            let initialColorsApplied = false;
            Object.entries(regionOverlayCounts.current).forEach(([regionName, count]) => {
              if (count > 0) {
                const overlayStrength = Math.min(count * 0.2, 1.0);
                const baseDotColor = new THREE.Color(0xffffff);
                const overlayColor = new THREE.Color(0xff0000);
                const initialRegionColor = new THREE.Color().copy(baseDotColor).lerp(overlayColor, overlayStrength);
                
                Object.values(dotIdMap.current).forEach(dot => {
                  if (dot.region === regionName && dot.instanceIndex !== undefined) {
                    initialRegionColor.toArray(colorAttribute.array, dot.instanceIndex * 3);
                    initialColorsApplied = true;
                  }
                });
              }
            });
            if (initialColorsApplied) {
              colorAttribute.needsUpdate = true;
              console.log("Globe.js: Initial overlay colors applied and flagged for update.");
            }
          }

          console.log("Calculating region centroids...");
          const calculatedCentroids = calculateRegionCentroids(regionDotsMap.current, dotIdMap.current);
          regionCentroidsMap.current = calculatedCentroids;
          console.log("Region centroids calculated:", regionCentroidsMap.current);
        } else {
          console.warn("dotIdMap is empty, skipping region assignment and centroid calculation.");
        }
        // --- End Region Assignment ---

      } catch (error) {
        console.error("Error during dot loading or land mask processing for InstancedMesh:", error);
      }
      setIsLoading(false); // Hide loading indicator
      console.log("Instanced dots processing complete.");
    };

    loadDots(); // Initiate the dot loading process.

    // --- Interaction Handlers ---
    const onMouseDown = (event) => {
      isDragging = true;
      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      // Adjust rotation speed as needed
      const rotationSpeed = 0.005; 
      if (globeSphereRef.current) {
        globeSphereRef.current.rotation.y += deltaMove.x * rotationSpeed;
        globeSphereRef.current.rotation.x += deltaMove.y * rotationSpeed;
      }
      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseUp = () => {
      isDragging = false;
    };
    
    const onMouseLeave = () => { // Stop dragging if mouse leaves canvas
      isDragging = false;
    };

    const onWheel = (event) => {
      // Adjust zoom speed as needed
      const zoomSpeed = 0.001;
      camera.position.z += event.deltaY * zoomSpeed;

      // Clamp camera zoom to prevent extreme zoom in/out
      camera.position.z = Math.max(1.2, Math.min(camera.position.z, 5)); // Min zoom 1.2, Max zoom 5
      camera.updateProjectionMatrix();
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave); // Handle mouse leaving the canvas
    renderer.domElement.addEventListener('wheel', onWheel);


    // --- Animation Loop ---
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Animate arcs (e.g., fade out, or move a particle along them) - Placeholder for future
      // For now, arcs are removed by timeout in drawTrafficArc

      renderer.render(scene, camera);
    };
    animate();

    // --- ARC DRAWING FUNCTIONALITY ---
    const drawTrafficArc = (sourceCountryCode) => {
      if (!globeSphereRef.current || !sceneRef.current || Object.keys(regionCentroidsMap.current).length === 0) {
        console.warn("Globe not ready for drawing arcs yet.");
        return;
      }

      const sourceRegionName = countryToRegion[sourceCountryCode];
      const targetRegionName = "NorthAmerica"; // Target is always North America

      if (!sourceRegionName || sourceRegionName === "Undefined") {
        console.warn(`Source region for country code ${sourceCountryCode} not found or is Undefined. Cannot draw arc.`);
        return;
      }
      if (sourceRegionName === targetRegionName) {
        // console.log(`Source region ${sourceRegionName} is the same as target. Skipping arc.`);
        return; // Don't draw arc if source is already North America
      }

      const sourceCentroidData = regionCentroidsMap.current[sourceRegionName];
      const targetCentroidData = regionCentroidsMap.current[targetRegionName];

      if (!sourceCentroidData) {
        console.warn(`Centroid for source region ${sourceRegionName} not found.`);
        return;
      }
      if (!targetCentroidData) {
        console.warn(`Centroid for target region ${targetRegionName} (NorthAmerica) not found.`);
        return;
      }

      const startPoint = new THREE.Vector3(sourceCentroidData.x, sourceCentroidData.y, sourceCentroidData.z);
      const endPoint = new THREE.Vector3(targetCentroidData.x, targetCentroidData.y, targetCentroidData.z);

      // Calculate control point for the arc
      const midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
      const distance = startPoint.distanceTo(endPoint);
      // Offset control point radially from globe center
      // The height of the arc can be proportional to the distance
      const arcHeight = distance * 0.3 + 0.1; // Adjust 0.3 for more/less curve, 0.1 min height
      midPoint.normalize().multiplyScalar(1 + arcHeight); // 1 is globe radius

      const curve = new THREE.QuadraticBezierCurve3(startPoint, midPoint, endPoint);
      
      const points = curve.getPoints(50); // Get 50 points along the curve
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Simple line material for the arc
      const material = new THREE.LineBasicMaterial({ 
        color: 0xff00ff, // Bright magenta color for arcs
        linewidth: 1, // Note: linewidth > 1 may not work on all platforms/drivers with WebGLRenderer
        transparent: true,
        opacity: 0.8
      }); 
      
      const arcLine = new THREE.Line(geometry, material);
      globeSphereRef.current.add(arcLine); // Add arc to the globe sphere so it rotates with it
      activeArcsRef.current.push(arcLine);

      // Remove arc after a delay
      setTimeout(() => {
        if (globeSphereRef.current) {
            globeSphereRef.current.remove(arcLine);
        }
        geometry.dispose();
        material.dispose();
        activeArcsRef.current = activeArcsRef.current.filter(arc => arc !== arcLine);
      }, 5000); // Arc visible for 5 seconds
    };


    // --- WEBSOCKET CLIENT SETUP ---
    const connectWebSocket = () => {
      console.log('Globe.js: Attempting to connect to WebSocket:', wsUrl);
      websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('Globe.js: WebSocket connection established.');
      };

      websocket.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data.toString());
          // console.log('Globe.js: Received WebSocket message:', messageData);

          if (messageData.type === 'trafficUpdate' && messageData.payload) {
            // console.log('Globe.js: Received trafficUpdate:', messageData.payload);
            messageData.payload.forEach(item => {
              if (item.countryCode) {
                drawTrafficArc(item.countryCode);
              }
            });
          }
        } catch (e) {
          console.error('Globe.js: Error processing WebSocket message:', e);
        }
      };

      websocket.onerror = (error) => {
        console.error('Globe.js: WebSocket error:', error);
      };

      websocket.onclose = (event) => {
        console.log('Globe.js: WebSocket connection closed.', event.code, event.reason);
        // Optional: Implement reconnection logic
        // setTimeout(connectWebSocket, 5000); // Attempt to reconnect after 5 seconds
      };
    };

    if (typeof window !== 'undefined') { // Ensure WebSocket is only created in browser
        connectWebSocket();
    }


    const handleResize = () => {
      if (mountRef.current) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      
      // Remove interaction event listeners
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
        renderer.domElement.removeEventListener('wheel', onWheel);
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // Dispose of Three.js objects
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      if (glowTexture) glowTexture.dispose(); 
      glowMaterial.dispose(); 
      dotGeometry.dispose(); 
      dotMaterial.dispose();
      
      // instancedDotsMesh and glowSprite are children of globeSphere.
      // Removing globeSphereRef.current will also remove them from the scene.
      if (globeSphereRef.current && sceneRef.current) {
        sceneRef.current.remove(globeSphereRef.current);
      }
      // Clean up any remaining arcs
      activeArcsRef.current.forEach(arc => {
        if (globeSphereRef.current) globeSphereRef.current.remove(arc);
        if (arc.geometry) arc.geometry.dispose();
        if (arc.material) arc.material.dispose();
      });
      activeArcsRef.current = [];
      
      dotIdMap.current = {};
      regionDotsMap.current = {}; 
      regionCentroidsMap.current = {}; 
      regionOverlayCounts.current = {};
      if (instancedDotsMeshRef.current) {
        // Proper disposal of InstancedMesh if it was added to scene
        if (instancedDotsMeshRef.current.parent) {
            instancedDotsMeshRef.current.parent.remove(instancedDotsMeshRef.current);
        }
        // instancedDotsMeshRef.current.dispose(); // Geometry and material are shared, disposed above
        instancedDotsMeshRef.current = null;
      }
      if (globeSphereRef.current) {
        // globeSphereRef.current.geometry.dispose(); // Shared, disposed above
        // globeSphereRef.current.material.dispose(); // Shared, disposed above
        globeSphereRef.current = null;
      }
      sceneRef.current = null;

      // Close WebSocket connection
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []); // Empty dependency array, so this runs once on mount and cleanup on unmount

  // Effect to handle country blacklist/unblacklist updates
  useEffect(() => {
    if (!countryUpdate || !countryUpdate.code || !instancedDotsMeshRef.current || Object.keys(dotIdMap.current).length === 0) {
      return;
    }

    const { type, code, name, isInitial } = countryUpdate;
    const countryCode = code;
    const targetRegionName = countryToRegion[countryCode];

    if (!targetRegionName) {
      console.warn(`Region not found for country code (${type}): ${countryCode}`);
      return;
    }

    let count;
    const currentCountForRegion = regionOverlayCounts.current[targetRegionName] || 0;

    if (type === 'blacklist') {
        if (!isInitial) { // Only increment for interactive blacklisting
            console.log(`Globe.js INTERACTIVE BLACKLIST for ${targetRegionName}: Old count: ${currentCountForRegion}`);
            regionOverlayCounts.current[targetRegionName] = currentCountForRegion + 1;
            console.log(`Globe.js INTERACTIVE BLACKLIST for ${targetRegionName}: New count: ${regionOverlayCounts.current[targetRegionName]}`);
        }
        // For initial load or after interactive update, 'count' is the current value in the ref.
        count = regionOverlayCounts.current[targetRegionName] || 0; 
        // console.log(`Country ${name} (${countryCode}) blacklisted. Region ${targetRegionName} overlay count: ${count}. Initial: ${isInitial}`); // Covered by ColorCalc log
    } else if (type === 'unblacklist') {
        // Unblacklist always decrements interactively (isInitial should be false for unblacklist)
        console.log(`Globe.js INTERACTIVE UNBLACKLIST for ${targetRegionName}: Old count: ${currentCountForRegion}`);
        regionOverlayCounts.current[targetRegionName] = Math.max(0, currentCountForRegion - 1);
        console.log(`Globe.js INTERACTIVE UNBLACKLIST for ${targetRegionName}: New count: ${regionOverlayCounts.current[targetRegionName]}`);
        count = regionOverlayCounts.current[targetRegionName] || 0;
        // console.log(`Country ${name} (${countryCode}) unblacklisted. Region ${targetRegionName} overlay count: ${count}.`);  // Covered by ColorCalc log
    } else {
        return; // Unknown type
    }
    // The rest of the logic for setting finalColor and updating attribute remains the same
    
    const overlayStrength = Math.min(count * 0.2, 1.0);
    const baseDotColor = new THREE.Color(0xffffff);
    const overlayColor = new THREE.Color(0xff0000);
    const finalColor = new THREE.Color().copy(baseDotColor).lerp(overlayColor, overlayStrength);

    console.log(`Globe.js ColorCalc - Region: ${targetRegionName}, Count: ${count}, Strength: ${overlayStrength.toFixed(2)}, Final Color (RGB): ${finalColor.r.toFixed(2)}, ${finalColor.g.toFixed(2)}, ${finalColor.b.toFixed(2)}, isInitial: ${isInitial}, Type: ${type}`);

    let updatedColorForRegion = false;
    const colorAttribute = instancedDotsMeshRef.current.geometry.getAttribute('color');
    if (!colorAttribute) {
      console.error(`Failed to get 'color' attribute for updating (${type}).`);
      return;
    }

    Object.values(dotIdMap.current).forEach(dot => {
      if (dot.region === targetRegionName && dot.instanceIndex !== undefined) {
        finalColor.toArray(colorAttribute.array, dot.instanceIndex * 3);
        updatedColorForRegion = true;
      }
    });

    if (updatedColorForRegion) {
      colorAttribute.needsUpdate = true;
      console.log(`Updated colors for dots in region (${type.toUpperCase()}): ${targetRegionName} to R:${finalColor.r.toFixed(2)} G:${finalColor.g.toFixed(2)} B:${finalColor.b.toFixed(2)}`);
    }
  }, [countryUpdate]);


  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          color: 'white', 
          zIndex: 10,
          padding: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px'
        }}>
          Loading Globe Data... (~{NUM_POINTS_TO_GENERATE / 1000}k points)
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%', backgroundColor: '#130022' }} />
    </div>
  );
};

export default Globe;
