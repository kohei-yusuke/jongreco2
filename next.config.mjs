/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // すべてのAPIルートでNode.js runtimeを使用
  experimental: {
    serverActions: true,
    fallback: {
      'app/api/**/*': {
        runtime: 'nodejs'
      }
    }
  }
};

export default nextConfig;
