express       = require 'express'
request       = require 'request'
bodyParser    = require 'body-parser'
{exec}        = require 'child_process'
fs            = require 'fs'
randomstring  = require 'randomstring'
S3            = require 'aws-sdk/clients/s3'
{Account}     = require './mongoose.js'
{Containers}  = require './mongoose.js'
{Slips}       = require './mongoose.js'

client_id     = process.env.CLIENT_ID
client_secret = process.env.CLIENT_SECRET
verifyToken   = process.env.VERIFY_TOKEN
awsKey        = process.env.AWS_KEY
awsSecret     = process.env.AWS_SECRET

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
    res.status(500).send({"Error": "Looks like we're not getting code."})
  else
    request
      url: 'https://slack.com/api/oauth.access'
      qs:
        code: req.query.code
        client_id: client_id
        client_secret: client_secret
      method: 'GET', (err, res, body) ->
        if err
          console.log(err)
        else
          exist = Account.count
                    team_id: body.team_id
          if exist > 0
            result    = JSON.parse body
            id        = randomstring.generate()
            oauth     = result.access_token
            team_name = result.team_name
            team_id   = result.team_id
            Account.findOneAndUpdate
              team_id: team_id,
                oauth: oauth
                active: true
            .exec()
          else
            result      = JSON.parse body
            id          = randomstring.generate()
            oauth       = result.access_token
            team_name   = result.team_name
            team_id     = result.team_id
            newAccount  = Account
              _id: id
              team_id: team_id
              team_name: team_name
              active: true
              accepted: false
              krateToken: null
              oauth: oauth
              plan: 0
              maxAllowedCont: 0
              runningCont: 0
              containers: []
              slips: []
              createdAt: new Date()
            newAccount.save()
          res.redirect 'https://google.com'

app.post '/message_action', (req, res) ->
  result        = JSON.parse req.body.payload
  callback_id   = result.callback_id
  action        = result.actions[0].name
  value         = result.actions[0].value
  team_id       = result.team.id
  channel_id    = result.channel.id
  response_url  =	result.response_url
  slackToken    = result.token
  if not slackToken or slackToken isnt verifyToken
    res.send 'This request doesn\'t seem to be coming from Slack.'
  else
    switch callback_id
      when "stop_cont"
        if action is "yes"
          stopCont value, team_id, channel_id, response_url
          res.send
            "text": "Stopping Krate '"+value+"'..."
            "username": "Krate"
        else
          res.send
            "text": "Leaving Krate '"+value+"' alone."
            "username": "Krate"
      when "delete_slip"
        if action is "yes"
          deleteSlip value, team_id, channel_id, response_url
          res.send
            "text": "Deleting Slip '"+value+"'..."
            "username": "Krate"
        else
          res.send
            "text": "Leaving Slip '"+value+"' alone."
            "username": "Krate"
      else
        res.send
          "text": "I didn't understand that option."
          "username": "Krate"

app.post '/command', (req, res) ->
  slackToken = req.body.token
  if not slackToken or slackToken isnt verifyToken
    res.send 'This request doesn\'t seem to be coming from Slack.'
  else
    text          = req.body.text
    response_url  = req.body.response_url
    channel_id    = req.body.channel_id
    team_id       = req.body.team_id
    command       = text.split(' ')[0].toLowerCase
    helpCheck     = text.split(' ')[1].toLowerCase
    Account.findOne
      team_id: team_id, (err, data) ->
        if err
          console.log err
        else
          userDoc = data
          if userDoc.accepted is false and command isnt 'configure'
            res.send
              "text": "It doesn't look like you have configured Slack with your Krate account. Please create an account at https://krate.sh and run the '/kr configure' command."
              "username": "Krate"
          else if userDoc.accepted is false
            res.send
              "text": "It looks like your account is not active. Please login to your account at https://krate.sh/login to find out why."
              "username": "Krate"
          else
            switch command
              when "configure"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr configure <KEY>"
                else
                  res.send
                    "text": "Request received..."
                  configure text, team_id, channel_id, response_url, userDoc
              when "krate"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr krate [start,stop,status,attach,detach] <SLIP_NAME>"
                else
                  res.send
                    "text": "Request received..."
                  krate text, team_id, channel_id, response_url, userDoc
