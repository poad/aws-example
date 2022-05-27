ARG LLVM_VERSION=14
ARG NODE_VERSION=16
ARG DIST=debian

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

FROM ${BASE_IMAGE}:node${NODE_VERSION} AS builder

COPY --from=downloader /tmp/llvm-snapshot.gpg.key /tmp/llvm-snapshot.gpg.key
COPY --from=downloader /tmp/sh.rustup.rs /tmp/sh.rustup.rs

ARG LLVM_VERSION

WORKDIR /var/task/

ENV PATH ${PATH}:/root/.cargo/bin
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq \
 && apt-get install --no-install-recommends -qqy \
    unzip \
    libcurl4-openssl-dev \
    python3.9-minimal \
    python3.9-dev \
    lsb-release \
    curl \
    ca-certificates \
    gnupg2 \
    binutils \
    apt-utils \
    software-properties-common \
 && apt-key add /tmp/llvm-snapshot.gpg.key \
 && rm -rf /tmp/llvm-snapshot.gpg.key \
 && echo "deb http://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-${LLVM_VERSION} main" >> /etc/apt/sources.list.d/llvm-toolchain.list \
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

RUN cargo build --target x86_64-unknown-linux-gnu \
 && cargo build --release --target x86_64-unknown-linux-gnu

FROM ${BASE_IMAGE}:node${NODE_VERSION} AS release

COPY --from=builder /work/target/x86_64-unknown-linux-gnu/release/handler /var/task/handler
RUN chmod +x /var/task/handler

WORKDIR /var/task/

ENTRYPOINT [ "/var/task/handler" ]

FROM ${DEBUG_IMAGE}:node${NODE_VERSION} AS debug

ENV RUST_BACKTRACE=full

COPY --from=builder /work/target/x86_64-unknown-linux-gnu/debug/handler /var/task/handler
RUN chmod +x /var/task/handler

WORKDIR /var/task/

ENTRYPOINT [ "aws-lambda-rie", "/var/task/handler" ]
