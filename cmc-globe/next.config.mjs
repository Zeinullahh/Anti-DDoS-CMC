/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Can be kept or removed based on preference
  // output: 'export', // REMOVED: This line prevents API routes and server-side logic.
  images: {
    unoptimized: true, // May not be needed without 'export', but harmless for now.
  },
};

export default nextConfig;
