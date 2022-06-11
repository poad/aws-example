/** @type {import('next').NextConfig} */
import withPlugins from 'next-compose-plugins';
import analyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withPlugins([
  [withBundleAnalyzer],
],
  {
    webpack5: true,
    reactStrictMode: true,
    esmExternals: true,
    swcLoader: true,
    swcMinify: false,
    experimental: {
      modern: true,
      outputStandalone: true,
    }
  }
);
