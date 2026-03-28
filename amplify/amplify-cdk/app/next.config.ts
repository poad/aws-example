import withBundleAnalyzer from '@next/bundle-analyzer';
import { NextConfig } from 'next';

const config: NextConfig = {
  output: "export",
  reactStrictMode: true,
  compiler: {
    emotion: true,
  },
  experimental: {
    esmExternals: true,
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(config);
