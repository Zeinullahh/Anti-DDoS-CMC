/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Can be kept or removed based on preference
  output: 'export',    // Enables static HTML export
  images: {
    unoptimized: true, // Necessary for static export if using next/image with non-standard loaders
  },
};

export default nextConfig;
