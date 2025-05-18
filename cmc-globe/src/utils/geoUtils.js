// geoUtils.js

/**
 * Converts latitude and longitude (in degrees) to 3D Cartesian coordinates on a sphere.
 * This function uses the standard spherical to Cartesian coordinate conversion formulas.
 * Longitude is mapped to the XZ plane, and latitude to the Y axis.
 * The coordinate system is right-handed, with Y up.
 *
 * @param {number} lat Latitude in degrees (-90 to 90).
 * @param {number} lon Longitude in degrees (-180 to 180).
 * @param {number} [radius=1] The radius of the sphere. Defaults to 1 for a unit sphere.
 * @returns {{x: number, y: number, z: number}} Object containing the Cartesian (x, y, z) coordinates.
 */
export function latLonToCartesian(lat, lon, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return { x, y, z };
}

/**
 * Generates a simple sequential unique ID.
 * This is a basic implementation. For more robust unique ID generation in a larger
 * application, consider using libraries like UUID.
 * The counter ensures that each call returns a new, incremented ID.
 */
let _idCounter = 0; // Private counter for ID generation
export function generateUniqueId() {
  _idCounter++;
  return _idCounter;
}

/**
 * Generates a specified number of approximately uniformly distributed points (latitude, longitude)
 * on the surface of a sphere using the Fibonacci lattice (or Golden Spiral) method.
 * This method provides a good distribution of points, avoiding clustering at the poles
 * that can occur with simple equirectangular grid sampling.
 *
 * @param {number} numPoints The desired number of points to generate.
 * @returns {Array<{lat: number, lon: number}>} An array of point objects, each with `lat` and `lon` properties in degrees.
 */
export function generateLatLonGrid(numPoints) {
  const points = [];
  const phi = Math.PI * (3.0 - Math.sqrt(5.0)); // Golden angle in radians, crucial for Fibonacci lattice

  for (let i = 0; i < numPoints; i++) {
    // Distribute y uniformly from 1 (North Pole) to -1 (South Pole)
    const y = 1 - (i / (numPoints - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y); // Radius of the circle at this y height

    const theta = phi * i; // Angle for this point, incremented by the golden angle

    // Calculate x and z coordinates in Cartesian space for a unit sphere
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    // Convert these unit Cartesian (x,y,z) coordinates back to latitude and longitude
    const lat = Math.asin(y) * (180 / Math.PI);       // Latitude in degrees
    const lon = Math.atan2(z, x) * (180 / Math.PI); // Longitude in degrees

    points.push({ lat, lon });
  }
  return points;
}

/**
 * Asynchronously samples a provided image (land mask) to filter an array of geographic points.
 * It keeps only the points that fall on "land" areas of the mask.
 * This function assumes the land mask is an equirectangular projection image where:
 *  - Land areas are represented by white pixels (or close to white, e.g., R,G,B > 200).
 *  - Water/non-land areas are transparent or non-white.
 *
 * The process involves:
 * 1. Loading the image specified by `imagePath`.
 * 2. Drawing this image onto an offscreen HTML5 Canvas to enable pixel data access.
 * 3. For each input `point` (lat, lon):
 *    a. Convert its (lat, lon) to (u, v) texture coordinates corresponding to the equirectangular map.
 *    b. Map these (u, v) coordinates to (x, y) pixel coordinates on the canvas.
 *    c. Read the RGBA pixel data at (x, y).
 *    d. If the pixel is determined to be "land" (primarily white and opaque), the point is kept.
 * 4. Returns a Promise that resolves to an array of the filtered land points.
 *
 * @param {Array<{lat: number, lon: number}>} points An array of geographic points to filter.
 * @param {string} imagePath The path to the land mask image (e.g., '/land-mask.png').
 * @returns {Promise<Array<{lat: number, lon: number}>>} A Promise that resolves with an array of points determined to be on land.
 */
export async function sampleLandMask(points, imagePath) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Important for environments where the image might be served from a different origin,
    // or to avoid tainted canvas issues if the image source is not strictly same-origin.
    img.crossOrigin = "Anonymous"; 
    img.src = imagePath;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      // Use { willReadFrequently: true } for potential performance optimization if supported,
      // as we'll be calling getImageData repeatedly.
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        console.error("Failed to get 2D context for land mask sampling. Canvas operations not supported or context limit reached.");
        return reject(new Error("Failed to get 2D context for land mask sampling"));
      }
      ctx.drawImage(img, 0, 0);

      const landPoints = points.filter(point => {
        // Convert latitude/longitude to normalized texture coordinates (u, v)
        // u (horizontal) corresponds to longitude: 0 at -180deg, 0.5 at 0deg, 1 at 180deg.
        const u = (point.lon + 180) / 360;
        // v (vertical) corresponds to latitude: 0 at +90deg (North Pole), 0.5 at 0deg (Equator), 1 at -90deg (South Pole).
        const v = (90 - point.lat) / 180;

        // Map normalized (u,v) to pixel coordinates (x,y) on the image.
        // Ensure coordinates are within the image bounds [0, width-1] and [0, height-1].
        const x = Math.max(0, Math.min(Math.floor(u * img.width), img.width - 1));
        const y = Math.max(0, Math.min(Math.floor(v * img.height), img.height - 1));

        try {
          const pixelData = ctx.getImageData(x, y, 1, 1).data; // [R, G, B, A]
          // Define "land" as pixels that are mostly white and mostly opaque.
          // Thresholds (e.g., > 200) can be adjusted based on the specifics of the land-mask.png.
          const isLand = pixelData[0] > 200 && // Red channel
                         pixelData[1] > 200 && // Green channel
                         pixelData[2] > 200 && // Blue channel
                         pixelData[3] > 200;   // Alpha channel (opacity)
          return isLand;
        } catch (e) {
          // This might occur if x,y are somehow still out of bounds, though Math.min/max should prevent it.
          // Also, getImageData can throw security errors in some environments if the canvas is tainted.
          // console.warn(`Error sampling pixel data at (${x},${y}) for point lon: ${point.lon}, lat: ${point.lat}. Error: ${e.message}`);
          return false; // Treat points that cause errors as non-land.
        }
      });
      resolve(landPoints);
    };

    img.onerror = (err) => {
      console.error("Failed to load land mask image from path:", imagePath, "Error details:", err);
      reject(new Error(`Failed to load land mask image: ${imagePath}. Check if the file exists in the public directory and the path is correct.`));
    };
  });
}

// --- Region Definitions and Utilities ---

/**
 * Defines geographical regions, their boundaries, and associated countries.
 * Boundaries are defined by latitude (latMin, latMax) and longitude (lonMin, lonMax).
 * Country codes are ISO 3166-1 alpha-2.
 */
export const regionDefinitions = {
  "NorthAmerica": {
    bounds: { latMin: 23, latMax: 85, lonMin: -170, lonMax: -50 },
    countries: ["US", "CA", "MX"]
  },
  "SouthAmerica": {
    bounds: { latMin: -60, latMax: 15, lonMin: -90, lonMax: -30 },
    countries: ["BR", "AR", "CO", "PE", "VE", "CL", "EC", "BO", "PY", "UY", "GY", "SR", "GF"]
  },
  // Moved CentralAsia before Europe and WestAsia to give it precedence in overlapping areas
  "CentralAsia": {
    // User-defined bounds. Note: These are very broad.
    // latMin: 19 is south (Arabian Sea), latMax: 45 is south of N. Kazakhstan.
    // lonMin: 10 is west (Eastern Europe), lonMax: 78 is reasonable for East.
    bounds: { latMin: 19, latMax: 45, lonMin: 48, lonMax: 78 }, 
    countries: ["KZ", "KG", "TJ", "TM", "UZ", "AF"] 
  },
  "Europe": { 
    bounds: { latMin: 35, latMax: 72, lonMin: -25, lonMax: 45 }, 
    countries: [
      "AL", "AD", "AM", "AT", "AZ", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK",
      "EE", "FO", "FI", "FR", "GE", "DE", "GI", "GR", "HU", "IS", "IE", "IM", "IT",
      "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL",
      "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SJ", "SE", "CH", "TR", "UA", "GB", "VA"
    ]
  },
  "Africa": {
    bounds: { latMin: -40, latMax: 40, lonMin: -20, lonMax: 55 },
    countries: [
      "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD",
      "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
      "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ", "NA", "NE",
      "NG", "RE", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG",
      "TN", "UG", "EH", "ZM", "ZW"
    ]
  },
  "EastAsia": {
    bounds: { latMin: 20, latMax: 50, lonMin: 100, lonMax: 150 }, 
    countries: ["CN", "JP", "KP", "KR", "MN", "TW", "HK", "MO"]
  },
  "SouthAsia": {
    bounds: { latMin: 5, latMax: 38, lonMin: 60, lonMax: 100 },
    countries: ["BD", "BT", "IN", "MV", "NP", "PK", "LK"]
  },
  "SoutheastAsia": {
    bounds: { latMin: -12, latMax: 25, lonMin: 92, lonMax: 141 },
    countries: ["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "TL", "VN"]
  },
  "WestAsia": { // Also known as Middle East
    bounds: { latMin: 12, latMax: 42, lonMin: 26, lonMax: 64 }, // Adjusted to include Turkey's Asian part
    countries: ["BH", "IQ", "IR", "IL", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "AE", "YE"]
    // Note: Cyprus, Armenia, Azerbaijan, Georgia, Turkey are often debated. Here, placed in Europe or specific regions.
  },
  "NorthAsia": { // Primarily Asian Russia (Siberia)
    // Should be north of Central Asia and East Asia, and east of European Russia.
    // Adjusted to be north of the new CentralAsia latMax and EastAsia latMax.
    bounds: { latMin: 50, latMax: 80, lonMin: 60, lonMax: 180}, // Starts at lon 60 (approx Urals)
    countries: ["RU"] 
  },
  "Oceania": {
    bounds: { latMin: -50, latMax: 0, lonMin: 110, lonMax: 180 }, 
    countries: ["AU", "NZ", "PG", "FJ", "SB", "VU", "NC", "PF", "WS", "TO", "FM", "KI", "MH", "NR", "PW", "TV"]
  }
};

/**
 * Creates a reverse lookup table mapping ISO country codes to their respective region names.
 */
export const countryToRegion = {};
Object.entries(regionDefinitions).forEach(([regionName, region]) => {
  region.countries.forEach(countryCode => {
    countryToRegion[countryCode] = regionName;
  });
});

/**
 * Assigns each dot to a region based on its latitude and longitude.
 * Modifies the dots in the `dotIdMap` by adding a `region` property.
 * Also returns a map of region names to arrays of dot IDs belonging to that region.
 *
 * @param {object} dotIdMap - A map where keys are dot IDs and values are dot objects { lat, lon, instanceIndex, x, y, z }.
 * @returns {object} An object `regionDots` where keys are region names and values are arrays of dot IDs.
 */
export function assignDotsToRegions(dotIdMap) {
  const regionDots = {};
  Object.keys(regionDefinitions).forEach(regionName => {
    regionDots[regionName] = [];
  });

  if (!dotIdMap || typeof dotIdMap !== 'object') {
    console.warn("assignDotsToRegions: dotIdMap is undefined or not an object. Skipping assignment.");
    return regionDots;
  }
  
  Object.entries(dotIdMap).forEach(([dotId, dot]) => {
    if (typeof dot.lat !== 'number' || typeof dot.lon !== 'number') {
      // console.warn(`Dot ${dotId} is missing lat/lon. Skipping region assignment.`);
      return; // Skip if lat/lon are not valid
    }
    const { lat, lon } = dot;
    let assigned = false;

    // Diagnostic for a point in Western Kazakhstan (Atyrau: ~47.1°N, 51.9°E)
    // Check if the current dot is close to these coordinates for logging
    if (Math.abs(lat - 47.1) < 0.5 && Math.abs(lon - 51.9) < 0.5) {
      console.log(`Checking dot near Atyrau (ID: ${dotId}, Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)})`);
    }

    for (const [regionName, regionData] of Object.entries(regionDefinitions)) {
      const { bounds } = regionData;
      if (lat >= bounds.latMin && lat <= bounds.latMax &&
          lon >= bounds.lonMin && lon <= bounds.lonMax) {
        
        if (Math.abs(lat - 47.1) < 0.5 && Math.abs(lon - 51.9) < 0.5) {
          console.log(`Dot near Atyrau MATCHED region: ${regionName}`);
        }
        
        dot.region = regionName; 
        regionDots[regionName].push(dotId);
        assigned = true;
        break; 
      }
    }
    if (!assigned) {
      if (Math.abs(lat - 47.1) < 0.5 && Math.abs(lon - 51.9) < 0.5) {
        console.log(`Dot near Atyrau was NOT ASSIGNED to any region with defined bounds.`);
      }
      // Optionally handle dots that don't fall into any defined region
      // console.warn(`Dot ${dotId} at (lat: ${lat}, lon: ${lon}) did not fall into any defined region.`);
      dot.region = "Undefined"; // Assign to a default "Undefined" region
      if (!regionDots["Undefined"]) {
        regionDots["Undefined"] = [];
      }
      regionDots["Undefined"].push(dotId);
    }
  });
  return regionDots;
}


/**
 * Calculates the 3D centroid for each region based on the average position of its dots.
 *
 * @param {object} regionDots - An object mapping region names to arrays of dot IDs.
 * @param {object} dotIdMap - The map of dot IDs to dot objects (containing x, y, z cartesian coordinates).
 * @returns {object} An object `regionCentroids` where keys are region names and values are {x, y, z} centroid coordinates.
 */
export function calculateRegionCentroids(regionDots, dotIdMap) {
  const regionCentroids = {};

  if (!regionDots || typeof regionDots !== 'object' || !dotIdMap || typeof dotIdMap !== 'object') {
    console.warn("calculateRegionCentroids: regionDots or dotIdMap is invalid. Skipping calculation.");
    return regionCentroids;
  }

  Object.keys(regionDots).forEach(regionName => {
    const dotIdsInRegion = regionDots[regionName];
    if (!dotIdsInRegion || dotIdsInRegion.length === 0) {
      // console.warn(`Region ${regionName} has no dots. Skipping centroid calculation.`);
      regionCentroids[regionName] = { x: 0, y: 0, z: 0 }; // Default or skip
      return;
    }

    let sumX = 0, sumY = 0, sumZ = 0;
    let validDotsCount = 0;

    dotIdsInRegion.forEach(dotId => {
      const dot = dotIdMap[dotId];
      if (dot && typeof dot.x === 'number' && typeof dot.y === 'number' && typeof dot.z === 'number') {
        sumX += dot.x;
        sumY += dot.y;
        sumZ += dot.z;
        validDotsCount++;
      } else {
        // console.warn(`Dot ${dotId} in region ${regionName} is missing cartesian coordinates or is undefined. Skipping for centroid calculation.`);
      }
    });

    if (validDotsCount === 0) {
      // console.warn(`Region ${regionName} has no valid dots with coordinates. Skipping centroid calculation.`);
      regionCentroids[regionName] = { x: 0, y: 0, z: 0 };
      return;
    }

    const avgX = sumX / validDotsCount;
    const avgY = sumY / validDotsCount;
    const avgZ = sumZ / validDotsCount;

    // Normalize the centroid to be on the surface of a unit sphere (or slightly offset if desired)
    const length = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);
    if (length === 0) { // Avoid division by zero if all dots were at the origin (highly unlikely)
      regionCentroids[regionName] = { x: 0, y: 0, z: 0 };
    } else {
      // Normalize to unit sphere. If you want centroids on the same radius as dots (e.g., 1.005), adjust here.
      const centroidRadius = 1.0; // Or use the same radius as dots if preferred for arc origins
      regionCentroids[regionName] = {
        x: (avgX / length) * centroidRadius,
        y: (avgY / length) * centroidRadius,
        z: (avgZ / length) * centroidRadius
      };
    }
  });

  return regionCentroids;
}
