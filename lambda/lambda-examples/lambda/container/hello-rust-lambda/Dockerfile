ARG NODE_VERSION=20
ARG DIST=ubuntu
ARG BASE_IMAGE=ghcr.io/poad/docker-aws-lambda-container-images/${DIST}
ARG DEBUG_IMAGE=ghcr.io/poad/docker-aws-lambda-container-images/${DIST}-debug

ARG DEPS="\
    autoconf \
    automake \
    g++ \
    gcc \
    libtool \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    wget \
    software-properties-common \
    build-essential \
    libnss3-dev \
    zlib1g-dev \
    libgdbm-dev \
    libncurses5-dev \
    libssl-dev \
    libffi-dev \
    libreadline-dev \
    libsqlite3-dev \
    libbz2-dev \
    libc6-dev \
    pkg-config \
    python3-distutils-extra \
    python3-venv \
    lsb-release \
    curl \
    ca-certificates \
    gnupg2 \
    binutils \
    apt-utils \
    clang \
"

FROM rust:slim AS builder

ARG BUILDPLATFORM
ARG TARGETPLATFORM

ENV PNPM_HOME="/root/pnpm"
ENV PATH="$PNPM_HOME:$PATH:/root/.cargo/bin"
ARG DEBIAN_FRONTEND=noninteractive
ENV SHELL="/bin/bash"

RUN apt-get update -qqq \
 && apt-get full-upgrade -qqqy \
 && apt-get install -qqy --no-install-recommends ${DEPS} ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /var/log/apt/* /var/log/alternatives.log /var/log/dpkg.log /var/log/faillog /var/log/lastlog \
 && mkdir -p /work

WORKDIR /root

RUN BUILD_OPTIONS=""; TARGET="" \
  && if [ "${TARGETPLATFORM}" != "${BUILDPLATFORM}" ]; then \
        case "${TARGETPLATFORM}" in \
            'linux/arm64') \
                apt update -qqqqy \
                apt install -qqqqy --no-install-recommends g++-aarch64-linux-gnu libc6-dev-arm64-cross crossbuild-essential-arm64  \
                TARGET="aarch64-unknown-linux-gnu" \
                BUILD_OPTIONS="--target=${TARGET}" \
                ;; \
            'linux/amd64') \
                apt update -qqqqy \
                apt install -qqqqy --no-install-recommends g++-x86_64-linux-gnu libc6-dev-amd64-cross crossbuild-essential-amd64 \
                TARGET="x86_64-unknown-linux-gnu" \
                BUILD_OPTIONS="--target=${TARGET}" \
                ;; \
            *) \
                ;; \
        esac \
 &&   rustup target add ${TARGET} \
 &&   rustup toolchain install stable-${TARGET} \
 ; fi \
 ; export BUILD_OPTIONS

COPY ./src /work/src
COPY Cargo.toml /work/Cargo.toml

WORKDIR /work

RUN cargo build ${BUILD_OPTIONS} \
 && cargo build --release ${BUILD_OPTIONS}

FROM ${BASE_IMAGE}:node${NODE_VERSION} AS release

COPY --from=builder /work/target/release/handler /var/task/handler
RUN chmod +x /var/task/handler

WORKDIR /var/task/

ENTRYPOINT [ "/var/task/handler" ]

FROM ${DEBUG_IMAGE}:node${NODE_VERSION} AS debug

ENV RUST_BACKTRACE=full

COPY --from=builder /work/target/debug/handler /var/task/handler
RUN chmod +x /var/task/handler

WORKDIR /var/task/

ENTRYPOINT [ "aws-lambda-rie", "/var/task/handler" ]
