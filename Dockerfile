FROM node:5.1
MAINTAINER Reittiopas version: 0.1

ENV WORK=/opt/digitransit-ui
ENV SENTRY_DSN=''
ENV SENTRY_SECRET_DSN=''
ENV PORT=8080
ENV API_URL='http://localhost:8080'
ENV APP_PATH=''
ENV CONFIG='rutebanken'
ENV PIWIK_ADDRESS=''
ENV PIWIK_ID=''
ENV NODE_ENV=''

WORKDIR ${WORK}

# Add application
RUN mkdir -p ${WORK}
ADD . ${WORK}

# Build
RUN npm install && \
  npm run static && \
  npm rebuild node-sass && \
  npm run build

CMD npm run start
# Run locally with: docker run -it -p 8079:8080 ui
