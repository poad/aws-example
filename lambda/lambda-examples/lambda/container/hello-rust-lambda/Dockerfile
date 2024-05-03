ARG LLVM_VERSION=18
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
"

FROM buildpack-deps:stable-curl AS downloader

RUN curl -sSLo /tmp/llvm-snapshot.gpg.key "https://apt.llvm.org/llvm-snapshot.gpg.key" \
 && curl --proto '=https' --tlsv1.2 -sSfo /tmp/sh.rustup.rs "https://sh.rustup.rs"

FROM --platform=$BUILDPLATFORM ${BASE_IMAGE}:node${NODE_VERSION} AS builder

ARG BUILDPLATFORM
ARG TARGETPLATFORM

COPY --from=downloader /tmp/llvm-snapshot.gpg.key /tmp/llvm-snapshot.gpg.key
COPY --from=downloader /tmp/sh.rustup.rs /tmp/sh.rustup.rs

ARG LLVM_VERSION

WORKDIR /var/task/

ENV PATH ${PATH}:/root/.cargo/bin
ARG DEBIAN_FRONTEND=noninteractive

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
 ;  fi \
 ; export BUILD_OPTIONS

RUN apt-get update -qq \
 && apt-get install --no-install-recommends -qqy \
    unzip \
    libcurl4-openssl-dev \
    python3-distutils-extra \
    python3-venv \
    lsb-release \
    curl \
    ca-certificates \
    gnupg2 \
    binutils \
    apt-utils \
    software-properties-common \
 && gpg --no-default-keyring --keyring /usr/share/keyrings/llvm-keyring.gpg --import /tmp/llvm-snapshot.gpg.key \
 && rm -rf /tmp/llvm-snapshot.gpg.key \
 && echo "deb [signed-by=/usr/share/keyrings/llvm-keyring.gpg] http://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-${LLVM_VERSION} main" >> /etc/apt/sources.list.d/llvm-toolchain.list \
 && apt-get update -qq \
 && apt-get install --no-install-recommends -qqy \
    clang-${LLVM_VERSION} \
    lld-${LLVM_VERSION} \
    libllvm${LLVM_VERSION} \
    gcc \
 && rm -rf /var/lib/apt/lists/* /var/log/apt/* /var/log/alternatives.log /var/log/dpkg.log /var/log/faillog /var/log/lastlog \
 && chmod +x /tmp/sh.rustup.rs \
 && /tmp/sh.rustup.rs -y \
 && rm -rf /tmp/sh.rustup.rs \
 && mkdir -p /work

ENV PATH ${PATH}:/root/.cargo/bin

WORKDIR /work

COPY ./src /work/src
COPY Cargo.toml /work/Cargo.toml

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
