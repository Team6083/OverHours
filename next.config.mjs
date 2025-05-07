/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
