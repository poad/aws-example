FROM buildpack-deps:focal-curl

LABEL maintainer="Kenji Saito<ken-yo@mbr.nifty.com>"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update -qq \
 && apt-get install -qqy --no-install-recommends \
       python3 \
       python-is-python3 \
       jq \
       gnupg2 \
       build-essential \
 && curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
 && echo "deb https://dl.yarnpkg.com/debian/ stable main" > /etc/apt/sources.list.d/yarn.list \
 && curl -sL https://deb.nodesource.com/setup_12.x | bash - \
 && apt-get install -qqy --no-install-recommends \
       nodejs \
       yarn \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /root/entrypoint.sh

RUN chmod +x /root/entrypoint.sh

ENTRYPOINT ["/root/entrypoint.sh" ]
