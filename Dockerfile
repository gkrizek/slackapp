FROM node:6.9
EXPOSE 8080
ADD /etc/slackapp /src

RUN /usr/bin/node /etc/slackapp/index.js
