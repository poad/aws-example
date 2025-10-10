ARG BUILDPLATFORM=linux/arm64
ARG TARGETPLATFORM=linux/arm64
ARG TARGETARCH=arm64

ARG NODE_VERSION=24

FROM --platform=$BUILDPLATFORM node:$NODE_VERSION-slim AS build

WORKDIR /build
COPY package.json ./

RUN npx -y pnpm@latest i
COPY . ./

RUN npx -y pnpm@latest build


FROM --platform=$BUILDPLATFORM node:$NODE_VERSION-slim AS dev

WORKDIR /work
COPY package.json ./

RUN npx -y pnpm@latest i

COPY . ./

ENV PORT=8080

ENTRYPOINT ["npx", "-y", "pnpm", "dev"]

FROM --platform=$BUILDPLATFORM node:$NODE_VERSION-slim

COPY --from=build /build /var/task

# Change ownership to non-root user
RUN chown -R node:node /var/task

WORKDIR "/var/task"

# Switch to non-root user
USER node

RUN CI=true npx -y pnpm@latest i --production

ENV PORT=8000

ENTRYPOINT [ "node", "dist/index.js" ]
