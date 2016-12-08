FROM node:6.9

# Create app directory
RUN mkdir -p /etc/slackapp
WORKDIR /etc/slackapp

# Install app dependencies
COPY package.json /etc/slackapp
RUN npm install

# Bundle app source
COPY src/ /etc/slackapp

EXPOSE 8080
CMD [ "npm", "start" ]