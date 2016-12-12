FROM node:6.9

#Create Sample App
RUN mkdir -p /var/example
COPY node-sample/ /var/example
RUN cd /var/example && npm install

# Create app directory
RUN mkdir -p /etc/slackapp
WORKDIR /etc/slackapp

# Install app dependencies
COPY package.json /etc/slackapp
RUN npm install

# Bundle app source
COPY server/ /etc/slackapp

EXPOSE 1515
CMD [ "npm", "start" ]