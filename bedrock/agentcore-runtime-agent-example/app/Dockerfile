ARG BUILDPLATFORM=linux/arm64
ARG TARGETPLATFORM=linux/arm64
ARG TARGETARCH=arm64

ARG NODE_VERSION=24

FROM --platform=$BUILDPLATFORM node:$NODE_VERSION-slim AS build

WORKDIR /build
COPY package.json ./

RUN npx -y pnpm@latest i
COPY . ./

RUN npx -y bun@latest run mastra build


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

ENV PORT=8080

ENTRYPOINT [ "node", "--import=./.mastra/output/instrumentation.mjs", ".mastra/output/index.mjs" ]
