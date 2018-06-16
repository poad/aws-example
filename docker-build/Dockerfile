FROM poad/docker-useful-webtool

RUN apk update && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
