/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aio-storage/shared'],
  output: 'standalone',
}

module.exports = nextConfig

