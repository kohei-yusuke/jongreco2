/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
  },
  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  // Static page generation configuration
  staticPageGenerationTimeout: 120,
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
