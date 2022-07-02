/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer');

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
const config = analyzer({
  webpack5: true,
  reactStrictMode: true,
  esmExternals: true,
  swcLoader: true,
  swcMinify: true,
  experimental: {
    modern: true,
  },
});

module.exports = config;
