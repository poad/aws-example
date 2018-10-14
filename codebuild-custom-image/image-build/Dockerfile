FROM debian:stable-slim

# A few reasons for installing distribution-provided OpenJDK:
#
#  1. Oracle.  Licensing prevents us from redistributing the official JDK.
#
#  2. Compiling OpenJDK also requires the JDK to be installed, and it gets
#     really hairy.
#
#     For some sample build times, see Debian's buildd logs:
#       https://buildd.debian.org/status/logs.php?pkg=openjdk-11

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
		bzip2 \
		unzip \
		xz-utils \
        ca-certificates \
        wget \
        curl \
	&& \
    rm -rf /var/lib/apt/lists/*

# Default to UTF-8 file.encoding
ENV LANG C.UTF-8

ARG JAVA_VERSION=11
ENV JAVA_HOME /usr/lib/jvm/java-${JAVA_VERSION}-openjdk-amd64

ARG basedir=${JAVA_HOME}
ARG mandir=$basedir/man

ENV MAVEN_HOME "/usr/share/maven/maven"
ENV MAVEN_CONFIG="/root/.m2"

ARG MAVEN_VERSION=3.5.4
ARG MAVEN_DOWNLOAD_SHA1="22cac91b3557586bb1eba326f2f7727543ff15e3"

RUN set -ex; \
	\
# deal with slim variants not having man page directories (which causes "update-alternatives" to fail)
	if [ ! -d /usr/share/man/man1 ]; then \
		mkdir -p /usr/share/man/man1; \
	fi; \
	\
    mkdir -p /usr/lib/jvm/; \
    TMP_DIR=$(mktemp -d); \
    cd ${TMP_DIR} \
    && \
    wget https://download.java.net/java/ga/jdk${JAVA_VERSION}/openjdk-${JAVA_VERSION}_linux-x64_bin.tar.gz \
    && \
    tar xf openjdk-${JAVA_VERSION}_linux-x64_bin.tar.gz -C /usr/lib/jvm/ \
    && \
    cd /usr/lib/jvm/ \
    ; \
    mv jdk-${JAVA_VERSION} java-${JAVA_VERSION}-openjdk-amd64 \
    ; \
    ln -s java-1.${JAVA_VERSION}.0-openjdk-amd64 java-${JAVA_VERSION}-openjdk-amd64 \
    ; \
    rm -r ${TMP_DIR} \
    ; \
    for i in $(ls ${basedir}/bin); do \
        update-alternatives --install /usr/bin/${i} ${i} $basedir/bin/${i} 1100; \
    done \
# Install Maven
    && \
    TMP_DIR=$(mktemp -d) \
    && \
    mkdir -p ${MAVEN_HOME} \
    && \
    curl -LSso ${TMP_DIR}/apache-maven-$MAVEN_VERSION-bin.tar.gz https://apache.org/dist/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.tar.gz \
    && \
    echo "$MAVEN_DOWNLOAD_SHA1 ${TMP_DIR}/apache-maven-$MAVEN_VERSION-bin.tar.gz" | sha1sum -c - \
    && \
    tar xzvf ${TMP_DIR}/apache-maven-$MAVEN_VERSION-bin.tar.gz -C ${MAVEN_HOME} --strip-components=1 \
    && \
    update-alternatives --install /usr/bin/mvn mvn ${MAVEN_HOME}/bin/mvn 10000 \
    && \
    mkdir -p ${MAVEN_CONFIG} \
    && \
    rm -r ${TMP_DIR}

RUN apt-get update -qq \
    && \
    apt-get purge -y -qq wget curl ca-certificates \
    && \
    apt-get autoremove --purge -y \
	&& \
    apt-get clean \
	&& \
    rm -rf /var/lib/apt/lists/*

# https://docs.oracle.com/javase/10/tools/jshell.htm
# https://en.wikipedia.org/wiki/JShell
CMD ["jshell"]

# If you're reading this and have any feedback on how this image could be
# improved, please open an issue or a pull request so we can discuss it!
#
#   https://github.com/docker-library/openjdk/issues
