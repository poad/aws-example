FROM node:lts-buster-slim AS base-image

WORKDIR /var/task/

RUN apt update -qq  \
 && apt install --no-install-recommends -qqy \
    autoconf \
    automake \
    g++ \
    libtool \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    python3-dev \
 && yarn global add aws-lambda-ric \
 && apt autoremove --purge  -qqy \
    autoconf \
    automake \
    g++ \
    libtool \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    python3-dev \
 && rm -rf /var/lib/apt/lists/* /var/log/apt/* /var/log/alternatives.log /var/log/dpkg.log /var/log/faillog /var/log/lastlog

FROM base-image AS builder

RUN mkdir -p /work

WORKDIR /work

COPY index.ts package.json tsconfig.json /work/

RUN yarn install \
 && yarn build

FROM base-image AS build-image

COPY --from=builder /work/index.js /work/package.json /var/task/
COPY bootstrap /var/task/

WORKDIR /var/task/
RUN yarn install --production \
 && chmod +x /var/task/bootstrap

ENTRYPOINT [ "/var/task/bootstrap" ]
CMD [ "/var/task/index.handler" ]
