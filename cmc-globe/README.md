# CMC 3D Globe Project

This project displays a 3D globe rendered with Three.js within a Next.js application. The globe is covered with hexagonal dots only on land areas, with each dot having a unique ID and latitude/longitude information. The UI is styled with Tailwind CSS using a glassmorphism aesthetic.

## Key Features

- Interactive 3D globe with continental dot mapping.
- Approximately 1.8 million instanced hexagonal dots on land areas.
- Each dot carries a unique ID and its (latitude, longitude) coordinates.
- Purple, reflective globe material.
- Dark purple UI shell with glassmorphic icon buttons.

## Tech Stack

- **Frontend Framework**: Next.js (JavaScript)
- **3D Engine**: Three.js
- **Styling**: Tailwind CSS (for glassmorphism components)
- **Build & Serve (Static Export)**: NGINX (configuration provided for static deployment)
- **Development**: Node.js (version 14 or higher), npm (or Yarn)

## Directory Structure

```
/cmc-globe
├── public/
│   ├── icons/           # chat.svg, settings.svg
│   └── land-mask.png    # Binary mask for land vs. water
├── src/
│   ├── components/
│   │   ├── Globe.js     # Three.js scene, dot generation, and instancing logic
│   │   ├── UIFrame.js   # Glassmorphic layout wrapper
│   │   └── IconButton.js# Glassmorphic icon buttons
│   ├── pages/
│   │   └── index.js     # Main application page
│   ├── styles/
│   │   └── globals.css  # Tailwind CSS setup
│   └── utils/
│       └── geoUtils.js  # Latitude/longitude conversions, ID generation, point sampling
├── tailwind.config.js   # Tailwind CSS configuration
├── next.config.mjs      # Next.js configuration
└── nginx.conf           # Example NGINX configuration for serving static export
```

## Setup and Running Locally

1.  **Clone the repository (if applicable)**
    ```bash
    # git clone <repository-url>
    # cd cmc-globe
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application. The globe might take a few moments to generate and render the dots, especially on the first load or with a high number of points. Check the browser console for progress logs.

## Building for Production (Static Export)

This project is set up for static export, which can be served by NGINX or any static web server.

1.  **Ensure `output: 'export'` is in `next.config.mjs`:**
    ```javascript
    // next.config.mjs
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      // reactStrictMode: true, // Can be enabled if desired
      output: 'export', // Enables static HTML export
      // Optional: Add basePath if deploying to a subdirectory
      // basePath: '/cmc-globe',
      // Optional: Configure images for static export if using non-optimized images extensively
      // images: {
      //   unoptimized: true,
      // },
    };
    export default nextConfig;
    ```
    (Note: I will check and update `next.config.mjs` if needed after this README).

2.  **Build the application:**
    ```bash
    npm run build
    ```
    This command first runs `next build` and then `next export`. The static files will be generated in the `/out` directory.

3.  **Serve with NGINX (Example):**
    The provided `nginx.conf` is an example configuration to serve the contents of the `/out` directory. You would typically use this with a Docker setup or a local NGINX installation.
    - Place the contents of the `/out` directory into your NGINX server's web root (e.g., `/usr/share/nginx/html/out` as configured in the example `nginx.conf`).
    - Ensure NGINX is configured to listen on the desired port (e.g., port 80).

## Data Structures

-   **Dot ID Map (`dotIdMap` in `Globe.js`):**
    A JavaScript object (stored in a React `useRef`) that maps a unique integer ID to metadata for each dot displayed on the globe.
    -   **Structure**: `{ id: { lat, lon, instanceIndex, x, y, z } }`
    -   `id`: Unique integer identifier for the dot.
    -   `lat`, `lon`: Latitude and longitude of the dot.
    -   `instanceIndex`: The index of this dot within the `InstancedMesh`.
    -   `x`, `y`, `z`: Cartesian coordinates of the dot on the 3D globe.
-   **InstancedMesh (`instancedDotsMesh` in `Globe.js`):**
    A `THREE.InstancedMesh` is used to render all hexagonal dots in a single draw call, which is crucial for performance when dealing with a large number of dots (up to ~2 million). Each instance's transformation (position, rotation, scale) is set via a matrix.

## Code Comments

Key logic in `src/components/Globe.js` (Three.js setup, dot generation, instancing) and `src/utils/geoUtils.js` (point generation on sphere, land mask sampling) is commented to explain the implementation details.

---

This README provides a basic guide. Further details on specific functionalities can be found within the code comments.
