/** @type {import('next').NextConfig} */
import withPlugins from 'next-compose-plugins';
import withPreact from 'next-plugin-preact';
import withBundleAnalyzer from '@next/bundle-analyzer';

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
const config = withPlugins([
  [analyzer, withPreact],
],
  {
    webpack5: true,
    reactStrictMode: true,
    esmExternals: true,
    swcLoader: true,
    swcMinify: true,
    experimental: {
      modern: true,
    },
  });

export default config;
