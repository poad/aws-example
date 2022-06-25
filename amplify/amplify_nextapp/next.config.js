/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer');

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = analyzer({
  webpack5: true,
  poweredByHeader: false,
  reactStrictMode: true,
  esmExternals: true,
  swcLoader: true,
  swcMinify: true,
  experimental: {
    modern: true,
  },
});
