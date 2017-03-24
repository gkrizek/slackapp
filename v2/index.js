const express = require('express')
const request = require('request')
const bodyParser = require('body-parser')
const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

client_id     = process.env.CLIENT_ID
client_secret = process.env.CLIENT_SECRET
verifyToken   = process.env.VERIFY_TOKEN
awsKey        = process.env.AWS_KEY
awsSecret     = process.env.AWS_SECRET

app = express();

const port = process.env.PORT || 3000

s3 = new S3({
  region: 'us-west-2',
  credentials: {
    accessKeyId: awsKey,
    secretAccessKey: awsSecret
  }
});

app.listen(port);

app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
  return res.send('app is working');
});

app.get('/oauth', function(req, res) {

}
