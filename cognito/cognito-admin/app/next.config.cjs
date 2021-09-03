/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    experimental: {
        esmExternals: true,
        swcLoader: true,
        swcMinify: true,
    },
};
