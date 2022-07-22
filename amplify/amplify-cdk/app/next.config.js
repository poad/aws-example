/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer');
const withPreact = require('next-plugin-preact');

const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(withPreact({
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: true,
  },
}));

module.exports = config;
