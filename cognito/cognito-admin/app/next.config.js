/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer');

const config = {
  output: "export",
  reactStrictMode: true,
  swcMinify: false,
  experimental: {
    esmExternals: true,
  }
};

module.exports = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(config);
