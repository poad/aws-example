const withBundleAnalyzer = require('@next/bundle-analyzer');

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: true,
  },
};

module.exports = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(config);
