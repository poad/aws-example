ARG BUILDPLATFORM=linux/arm64
ARG TARGETPLATFORM=linux/arm64
ARG TARGETARCH=arm64

ARG NODE_VERSION=24

FROM --platform=linux/arm64 node:$NODE_VERSION-slim AS build

RUN npm install -g bun pnpm
WORKDIR /build
COPY package.json ./

RUN pnpm i
COPY . ./

RUN bun run mastra build


FROM --platform=linux/arm64 node:$NODE_VERSION-slim AS dev

RUN npm install -g pnpm

WORKDIR /work
COPY package.json ./

RUN pnpm i

COPY . ./

ENV PORT=8080

ENTRYPOINT ["pnpm", "dev"]


FROM --platform=linux/arm64 node:$NODE_VERSION-slim

COPY --from=build /build /var/task

# Change ownership to non-root user
RUN chown -R node:node /var/task

WORKDIR "/var/task"

# Switch to non-root user
USER node

ENV PORT=8080

ENTRYPOINT [ "node", "--import=./.mastra/output/instrumentation.mjs", ".mastra/output/index.mjs" ]
