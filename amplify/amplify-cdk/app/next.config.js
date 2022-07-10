/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer');
const withPreact = require('next-plugin-preact');

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
const config = analyzer(withPreact({
  webpack5: true,
  reactStrictMode: true,
  esmExternals: true,
  swcLoader: true,
  swcMinify: true,
  experimental: {
    modern: true,
  },
}));

module.exports = config;
