FROM nginx:alpine
RUN apk update && apk upgrade --no-cache
COPY docker/gateway/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
