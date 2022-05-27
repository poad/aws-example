ARG LLVM_VERSION=14
ARG NODE_VERSION=16
ARG DIST=debian

ARG BASE_IMAGE=ghcr.io/poad/docker-aws-lambda-container-images/${DIST}
ARG DEBUG_IMAGE=ghcr.io/poad/docker-aws-lambda-container-images/${DIST}-debug

FROM ${BASE_IMAGE}:node${NODE_VERSION} AS builder

RUN mkdir -p /work

WORKDIR /work

COPY index.ts package.json tsconfig.json /work/

RUN yarn install \
 && yarn build

FROM ${BASE_IMAGE}:node${NODE_VERSION} AS release

COPY --from=builder /work/index.js /work/package.json /var/task/

WORKDIR /var/task/
RUN yarn cache clean \
 && yarn install --production

CMD [ "index.handler" ]


FROM ${DEBUG_IMAGE}:node${NODE_VERSION} AS debug

COPY --from=builder /work/index.js /work/package.json /var/task/

WORKDIR /var/task/
RUN yarn cache clean \
 && yarn install --production

CMD [ "index.handler" ]
