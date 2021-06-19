ARG LLVM_VERSION=12
ARG NODE_VERSION=14
ARG DIST=debian

ARG BASE_IMAGE=ghcr.io/poad/docker-aws-lambda-container-images/${DIST}:node${NODE_VERSION}
ARG DEBUG_IMAGE=ghcr.io/poad/docker-aws-lambda-container-images/${DIST}-debug:node${NODE_VERSION}

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

RUN curl -sSLO /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key \
 && curl --proto '=https' --tlsv1.2 -sSfo /tmp/sh.rustup.rs https://sh.rustup.rs

FROM ${BASE_IMAGE} AS builder-env

COPY --from=builder /tmp/llvm-snapshot.gpg.key /tmp/llvm-snapshot.gpg.key
COPY --from=builder /tmp/sh.rustup.rs /tmp/sh.rustup.rs

ARG LLVM_VERSION

WORKDIR /var/task/

ENV PATH ${PATH}:/root/.cargo/bin
ARG DEBIAN_FRONTEND=noninteractive

RUN apt update -qq  \
#  && apt upgrade -qqy  \
 && apt install --no-install-recommends -qqy \
    unzip \
    libcurl4-openssl-dev \
    python3.9-minimal \
    python3.9-dev \
    lsb-release \
    ca-certificates \
    gnupg2 \
    binutils \
    apt-utils \
    software-properties-common \
   #  dirmngr \
 && apt-key add /tmp/llvm-snapshot.gpg.key \
 && rm -rf /tmp/llvm-snapshot.gpg.key \
 && echo "deb http://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-${LLVM_VERSION} main" >> /etc/apt/sources.list.d/llvm-toolchain.list \
 && apt update -qq \
 && apt install --no-install-recommends -qqy \
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

FROM builder-env AS builder

WORKDIR /work

COPY ./src /work/src
COPY Cargo.toml /work/Cargo.toml

RUN cargo build --release

FROM ${BASE_IMAGE} AS release

ARG DEPS

COPY --from=builder /work/target/release/handler /var/task/handler
RUN chmod +x /var/task/handler

WORKDIR /var/task/

ENTRYPOINT [ "/var/task/bootstrap" ]
CMD [ "/var/task/handler" ]

FROM ${DEBUG_IMAGE}

COPY --from=builder /work/target/release/handler /var/task/handler
RUN chmod +x /var/task/handler 

WORKDIR /var/task/

ENTRYPOINT [ "/var/task/bootstrap" ]
CMD [ "/var/task/handler" ]
