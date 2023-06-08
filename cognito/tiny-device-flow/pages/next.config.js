const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: true,
  }
};

module.exports = withBundleAnalyzer(config);
