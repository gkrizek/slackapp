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
  response_url  = result.response_url
  slackToken    = result.token
  if not slackToken or slackToken isnt verifyToken
    res.send 'This request doesn\'t seem to be coming from Slack.'
  else
    switch callback_id
      when "stop_cont"
        if action is "yes"
          stopCont value, team_id, channel_id, response_url
          res.send
            "text": "Stopping Krate '#{value}'..."
            "username": "Krate"
        else
          res.send
            "text": "Leaving Krate '#{value}' alone."
            "username": "Krate"
      when "delete_slip"
        if action is "yes"
          deleteSlip value, team_id, channel_id, response_url
          res.send
            "text": "Deleting Slip '#{value}'..."
            "username": "Krate"
        else
          res.send
            "text": "Leaving Slip '#{value}' alone."
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
    command       = text.split(' ')[0]
    if text.split(' ')[1] then helpCheck = text.split(' ')[1].toLowerCase
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
            switch command.toLowerCase
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
              when "slip"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr slip [list,create,edit,delete] <SLIP_NAME>"
                else
                  res.send
                    "text": "Request received..."
                  slip text, team_id, channel_id, response_url, userDoc
              when "edit"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr edit <FILENAME>"
                else
                  res.send
                    "text": "Request received..."
                  edit text, team_id, channel_id, response_url, userDoc
              when "exec"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr exec <COMMAND>"
                else
                  res.send
                    "text": "Request received..."
                  exec text, team_id, channel_id, response_url, userDoc
              when "commit"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr commit [slip,file] <FILENAME>"
                else
                  res.send
                    "text": "Request received..."
                  commit text, team_id, channel_id, response_url, userDoc
              when "show"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr show <FILENAME> <LINE_NUMBER>"
                else
                  res.send
                    "text": "Request received..."
                  show text, team_id, channel_id, response_url, userDoc
              when "export"
                if helpCheck is "help"
                  res.send
                    "text": "Example: /kr export"
                else
                  res.send
                    "text": "Request received..."
                  exportCmd text, team_id, channel_id, response_url, userDoc
              when "help"
                res.send
                  "text": "Usage: /kr [configure, krate, slip, edit, commit, show, exec, export]"
                return
              else
                res.send
                  "text": "Didn't understand that command. Use '/kr help' for usage."

configure = (text, team_id, channel_id, response_url, userDoc) ->
  krateToken = text.split(' ')[1]
  if userDoc.accepted is true
    respond
      "text": "You have already configured your Slack team with your Krate account."
      "username": "Krate"
      response_url
  else
    if not krateToken
      respond
        "text": "You must pass a token. Example: '/kr configure abc123def456'"
        "username": "Krate"
        response_url
    else
      respond
        "text": "This is the configure command"
        "username": "Krate"
        response_url

krate = (text, team_id, channel_id, response_url, userDoc) ->
  command = text.split(' ')[1]
  switch command
    when "status"
      length = userDoc.containers.length
      if length is 0
        respond
          "text": "You don't have any containers running in this channel."
          "username": "Krate"
      else
        #does this properly find string in array of objects
        if channel_id in userDoc.containers
          for i in userDoc.containers
            if userDoc.containers[i].channel_id is channel_id
              respond
                "text": "Current running container: #{userDoc.containers[i].container_id}"
                "username": "Krate"
              break
        else
          respond
            "text": "There are no running containers in this channel."
            "username": "Krate"

    when "start"
      slip = text.split(' ')[2]
      if not slip
        respond
          "text": "You must specify a slip to boot with. Example: '/kr krate start bear'"
          "username": "Krate"
      else
        if slip in userDoc.slips
          if channel_id in userDoc.containers
            respond
              "text": "There is already a container running in this channel. You must stop or detach that container before starting a new one."
              "username": "Krate"
          else
            id            = randomstring.generate
            container_id  = randomstring.generate
            newCont       = Containers
                              _id:          id
                              container_id: containerId
                              host:         '10.5.5.1'
                              slip:         slip
                              team_id:      team_id
                              channel_id:   [channel_id]
            newCont.save (err, data) ->
              if err
                console.log err
              else
                Account.findOneAndUpdate
                  team_id:  team_id,
                    $push:
                      containers:
                        channel_id:   channel_id
                        container_id: container_id,
                    (err, data) ->
                      if err
                        console.log err
                      else
                        respond
                          "text": "Starting Krate #{container_id}..."
                          "username": "Krate"
        else
          respond
            "text": "I can't find that slip. Please make sure it's spelled correclt.y"
            "username": "Krate"

    when "stop"
      container = text.split(' ')[2]
      if not container
        respond
          "text": "You must specify a container to stop. Use '/kr krate status' to find current running container in this channel."
          "username": "Krate"
      else
        if channel_id in userDoc.containers
          if container and channel_id in userDoc.containers
            respond
              "text": "Are you sure you want to stop #{container}?"
              "attachments": [
                "text": "You might want to export your code changes first. This will also remove it from any other attached channels."
                "fallback": "Won't Delete the container."
                "callback_id": "stop_cont"
                "color": "#ab32a4"
                "attachment_type": "default"
                "actions": [
                  "name": "yes"
                  "text": "Obliterate it."
                  "type": "button"
                  "value": container,
                    "name": "no"
                    "text": "Don't touch it!"
                    "type": "button"
                    "value": containter
                ]
              ]
          else
            respond
              "text": "That conatiner doesn't seem to be running in this channel"
              "username": "Krate"
        else
          respond
            "text": "There are no running conatiners in this channel."
            "username": "Krate"

    when "attach"
      container = text.split(' ')[2]
      if not container
        respond
          "text": "You must specify a conatiner to attach. Use '/kr krate status' to find running containers"
          "username": "Krate"
      else
        Container.findOne
          container_id: container,
            (err, data) ->
              if err
                console.log err
              else
                if data.team_id isnt team_id
                  respond
                    "text": "I can't find a conatiner for your team by that name."
                    "username": "Krate"
                else
                  Account.findOneAndUpdate
                    team_id: team_id,
                      $push:
                        containers:
                          channel_id: channel_id
                          container_id: container,
                      (err, data) ->
                        if err
                          console.log err
                        else
                          Containers.findOneAndUpdate
                            container_id: container,
                              $push:
                                channel_id: channel_id,
                              (err, data) ->
                                if err
                                  console.log err
                                else
                                  respond
                                    "text": "Krate #{container} is now attached."
                                    "username": "Krate"
    #when "detach"

    #else
