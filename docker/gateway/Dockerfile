FROM nginx:alpine
# Bump APK_REVISION (YYYY-MM-DD) to force a fresh apk index past the buildx layer
# cache when a base-image package CVE needs the upgrade applied.
ARG APK_REVISION=2026-06-02
RUN echo "apk revision: $APK_REVISION" \
  && apk update \
  && apk upgrade --no-cache \
  && rm -rf /var/cache/apk/*
COPY docker/gateway/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
