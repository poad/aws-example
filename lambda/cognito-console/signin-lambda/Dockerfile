FROM alpine:latest AS base-image

WORKDIR /var/task/

RUN apk add --no-cache \
    nodejs \
    npm \
    autoconf \
    automake \
    build-base \
    cmake \
    libexecinfo-dev \
    libstdc++ \
    libtool \
    python3-dev \
 && npm i -g yarn \
 && yarn global add aws-lambda-ric \
 && apk del \
    autoconf \
    automake \
    bash \
    cmake \
    build-base \
    libexecinfo-dev \
    libcurl \
    libtool \
    make \
    python3-dev

FROM base-image AS builder

RUN mkdir -p /work

WORKDIR /work

COPY *.ts package.json tsconfig.json /work/

RUN yarn install \
 && yarn build

FROM base-image AS build-image

COPY --from=builder /work/*.js /work/package.json /var/task/
COPY bootstrap /var/task/

WORKDIR /var/task/
RUN yarn install --production \
 && chmod +x /var/task/bootstrap

ENTRYPOINT [ "/var/task/bootstrap" ]
CMD [ "/var/task/index.handler" ]
