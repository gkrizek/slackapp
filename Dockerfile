FROM node:6.9
EXPOSE 8080
RUN mkdir /etc/slackapp
ADD . /etc/slackapp
RUN cd /etc/slackapp && npm install
RUN node /etc/slackapp/src/index.js
