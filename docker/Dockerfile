# This image installs all dependencies and compiles the Argus frontend into a
# set of static files that can be served by any webserver.
# It should run with the git repo root as the build context
FROM node:16-bullseye as build
WORKDIR /app

COPY . /app

RUN apt-get update && apt-get install -y --no-install-recommends tini


RUN npm ci
RUN npx browserslist@latest --update-db
RUN npm run build


FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

RUN apk add --update tini tree

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/docker-entrypoint.sh /
COPY docker/runtime-config-template.json /

# These arguments are needed in the environment to properly configure and build
# Argus-frontend for this site:
ENV REACT_APP_BACKEND_URL=https://argus.cnaas.sunet.se:9000
ENV REACT_APP_ENABLE_WEBSOCKETS_SUPPORT=true
ENV REACT_APP_BACKEND_WS_URL=wss://argus.cnaas.sunet.se:9000/ws
ENV REACT_APP_COOKIE_DOMAIN=argus.cnaas.sunet.se
ENV REACT_APP_USE_SECURE_COOKIE=true
ENV REACT_APP_DEBUG=true
ENV REACT_APP_DEFAULT_AUTO_REFRESH_INTERVAL=30
ENV REACT_APP_REALTIME_SERVICE_MAX_RETRIES=5


EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "-v", "--"]
# CMD ["nginx", "-g", "daemon off;"]
CMD ["/docker-entrypoint.sh"]
# When used as an intermediate builder image, the complete set of statically
# built files to serve from the web server root can be copied from /app/build