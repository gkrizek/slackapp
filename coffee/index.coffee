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


clientId = process.env.CLIENT_ID
clientId = process.env.CLIENT_ID
clientSecret = process.env.CLIENT_SECRET
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


app.listen = ->
	port

