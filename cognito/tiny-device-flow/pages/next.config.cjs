/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || '/';

module.exports = {
    basePath,
    webpack5: true,
    reactStrictMode: true,
    experimental: {
        esmExternals: true,
        swcLoader: true,
        swcMinify: true,
    },
}
