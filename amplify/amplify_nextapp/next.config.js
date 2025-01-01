const withBundleAnalyzer = require('@next/bundle-analyzer');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
};

module.exports = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
