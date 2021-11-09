/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const basePath = isProd? '/oauth/device/activate' : '';

module.exports = {
    poweredByHeader: false,
    trailingSlash: true,
    basePath,
    swcMinify: true,
    reactStrictMode: true,
    esmExternals: true,
    basePath,
};
