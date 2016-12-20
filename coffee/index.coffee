express			= require 'express'
request			= require 'request'
bodyParser		= require 'body-parser'
{exec}			= require 'child_process'
fs				= require 'fs'
randomstring	= require 'randomstring'
S3				= require 'aws-sdk/clients/s3'
{Account}		= require './mongoose.js'
{Containers}	= require './mongoose.js'
{Slips}			= require './mongoose.js'


client_id = process.env.CLIENT_ID
client_secret = process.env.CLIENT_SECRET
verifyToken = process.env.VERIFY_TOKEN
awsKey = process.env.AWS_KEY
awsSecret = process.env.AWS_SECRET

app = express()

port = 8080

s3 = new S3
	region: "us-west-2"
	credentials:
		accessKeyId: awsKey
		secrectAccessKey: awsSecret


app.listen port

app.use bodyParser.urlencoded
	extended: true

app.get '/', (req, res) ->
	res.send 'Krate App is working'

app.get '/oauth', (req, res) ->
	if not req.query.code
		res.status(500).send ({"Error": "Looks like we're not getting code."})
	else
		request
			url: 'https://slack.com/api/oauth.access'
			qs:
				code: req.query.code
				client_id: client_id
				client_secret: client_secret
			method: 'GET'





