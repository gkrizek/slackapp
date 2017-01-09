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
  region: 'us-west-2'
  credentials:
    accessKeyId: awsKey
    secretAccessKey: awsSecret

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
      method: 'GET', (err, response, body) ->
        if err
          console.log(err)
        else
          result    = JSON.parse body
          team_id   = result.team_id
          exist   = Account.count
            team_id: team_id,
              (err, data) ->
                if err
                  console.log err
                else
                  if data > 0
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
  #add some git commands?
  slackToken = req.body.token
  if not slackToken or slackToken isnt verifyToken
    res.send 'This request doesn\'t seem to be coming from Slack.'
  else
    text          = req.body.text
    response_url  = req.body.response_url
    channel_id    = req.body.channel_id
    team_id       = req.body.team_id
    command       = text.split(' ')[0]
    if text.split(' ')[1] then helpCheck = text.split(' ')[1].toLowerCase()
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
            switch command.toLowerCase()
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
                  execute text, team_id, channel_id, response_url, userDoc
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
          response_url
      else
        myCont = {}
        for cont in userDoc.containers
          myCont[cont.channel_id] = cont.container_id
        contId = myCont[channel_id]
        if contId is undefined
          respond
            "text": "There are no running containers in this channel."
            "username": "Krate"
            response_url
        else
          respond
            "text": "Current running container: #{contId}"
            "username": "Krate"
            response_url
          break

    when "start"
      slip = text.split(' ')[2]
      if not slip
        respond
          "text": "You must specify a slip to boot with. Example: '/kr krate start bear'"
          "username": "Krate"
          response_url
      else
        if slip in userDoc.slips
          myCont = {}
          for cont in userDoc.containers
            myCont[cont.channel_id] = cont.container_id
          contId = myCont[channel_id]
          if contId is undefined
            id            = randomstring.generate()
            container_id  = randomstring.generate 10
            newCont       = Containers
              _id:          id
              container_id: container_id
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
                          response_url
          else
            respond
              "text": "There is already a container running in this channel. You must stop or detach that container before starting a new one."
              "username": "Krate"
              response_url
        else
          respond
            "text": "I can't find that slip. Please make sure it's spelled correctly."
            "username": "Krate"
            response_url

    when "stop"
      container = text.split(' ')[2]
      if not container
        respond
          "text": "You must specify a container to stop. Use '/kr krate status' to find current running container in this channel."
          "username": "Krate"
          response_url
      else
        myCont = {}
        for cont in userDoc.containers
          myCont[cont.channel_id] = cont.container_id
        contId = myCont[channel_id]
        if contId is undefined
          respond
            "text": "There are no running conatiners in this channel."
            "username": "Krate"
            response_url
        else
          if contId is container
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
                    "value": container
                ]
              ]
              response_url
          else
            respond
              "text": "That container doesn't appear to be running in this channel."
              "username": "Krate"
              response_url

    when "attach"
      container = text.split(' ')[2]
      if not container
        respond
          "text": "You must specify a conatiner to attach. Use '/kr krate status' to find running containers"
          "username": "Krate"
          response_url
      else
        Containers.findOne
          container_id: container,
            (err, data) ->
              if err
                console.log err
              else
                if data.team_id isnt team_id
                  respond
                    "text": "I can't find a conatiner for your team by that name."
                    "username": "Krate"
                    response_url
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
                                    response_url
    when "detach"
      container = text.split(' ')[2]
      if not container
        respond
          "text": "You must specify a container to detach. Use '/kr krate status' to see current running krates."
          "username": "Krate"
          response_url
      else
        Account.findOneAndUpdate
          team_id: team_id,
            $pull:
              containers:
                channel_id: channel_id,
            (err, data) ->
              if err
                console.log err
              else
                Containers.findOneAndUpdate
                  container_id: container,
                    $pull:
                      channel_id: channel_id,
                    (err, data) ->
                      respond
                        "text": "Krate #{container} was detached from curent channel."
                        "username": "Krate"
                        response_url

    else
      respond
        "text": "Unknown command. Use [help] for usage."
        "username": "Krate"
        response_url

slip = (text, team_id, channel_id, response_url, userDoc) ->
  command = text.split(' ')[1]
  switch command
    when "list"
      if userDoc.slips.length is 0
        respond
          "text": "You don't have any slips. Create one with '/kr slip create <SLIP_NAME>'"
          "username": "Krate"
          response_url
      else
        respond
          "text": "Current Slips: #{userDoc.slips}"
          "username": "Krate"
          response_url

    when "create"
      id        = randomstring.generate()
      filename  = text.split(' ')[2]
      s3Url     = "https://s3.amazonaws.com/testing-krate-slips/#{team_id}/#{filename}.json"
      file      = "{\n\t\"project_name\": \"#{filename}\",\n\t\"git_url\": \"<git-url>\",\n\t\"git_branch\": \"<git-branch>\"\n}"
      token     = userDoc.oauth
      params    =
            Bucket: "testing-krate-slips"
            Key: "#{team_id}/#{filename}.json"
            ACL: "private"
            Body: file
            ContentLanguage: "JSON"
      s3.putObject params, (err, res) ->
        if err
          console.log err
          respond
            "text": "There was a problem creating a slip."
            "username": "Krate"
            response_url
        else
          Account.findOne
            team_id: team_id,
              (err, data) ->
                if filename in userDoc.slips
                  respond
                    "text": "That slip name already exists. Please use a different name."
                    "username": "Krate"
                    response_url
                else
                  request
                    url: "https://slack.com/api/files.upload"
                    qs:
                      token:    token
                      filename: "#{filename}.json"
                      channels: channel_id
                      content:  file
                    method: 'POST',
                      (err, response, body) ->
                        if err
                          console.log err
                        else
                          newSlip = Slips
                            _id:        id
                            config_name: filename
                            url:        s3Url
                            team_id:    team_id
                            createdAt:  new Date()
                            updatedAt:  new Date()
                          newSlip.save (err, res) ->
                            if err
                              console.log err
                            else
                              Account.findOneAndUpdate
                                team_id: team_id,
                                  $push:
                                    slips: filename
                              .exec()

    when "edit"
      slip    = text.split(' ')[2]
      token   = userDoc.oauth
      team_id = userDoc.team_id
      if slip in userDoc.slips
        params  =
              Bucket: "testing-krate-slips"
              Key: "#{team_id}/#{slip}.json"
        s3.getObject params, (err, res) ->
          if err
            console.log err
          else
            request
              url: "https://slack.com/api/files.upload"
              qs:
                token: token
                filename: "#{slip}.json"
                channels: channel_id
                content: res.Body.toString()
              method: "POST",
                (err, response, body) ->
                  if err
                    console.log err
      else
        respond
          "text": "I couldn't find that slip"
          "username": "Krate"
          response_url

    when "delete"
      slip = text.split(' ')[2]
      if slip in userDoc.slips
        respond
          "text": "Are you sure you want to delete #{slip}?"
          "attachments": [
            "text": "This can't be undone and the slip will be lost forever."
            "fallback": "Won't Delete the slip."
            "callback_id": "delete_slip"
            "color": "#ab32a4"
            "attachment_type": "default"
            "actions": [
              "name": "yes"
              "text": "Obliterate it."
              "type": "button"
              "value": slip,
                "name": "no"
                "text": "Don't touch it!"
                "type": "button"
                "value": slip
            ]
          ]
          response_url
      else
        respond
          "text": "That slip doesn't exist."
          "username": "Krate"
          response_url

    else
      respond
        "text": "Unknown command. Use [help] for usage."
        "username": "Krate"
        response_url

edit = (text, team_id, channel_id, response_url, userDoc) ->
  file = text.split(' ')[1]
  Containers.findOne
    channel_id: channel_id,
      (err, data) ->
        host = data.host
        request
          #url: "http://#{host}/edit"
          url: "http://localhost:1515/edit"
          json: true
          headers:
            'content-type': 'application/json'
          body:
            'file':       file
            'channel_id': channel_id
            'token':      userDoc.oauth
          method: "POST",
            (err, response, body) ->
              if err
                console.log err
              else
                Slips.findOneAndUpdate
                  configName: file
                  team_id:    team_id,
                    updatedAt: new Date()

execute = (text, team_id, channel_id, response_url, userDoc) ->
  # Need to give proper response if no container running.
  command = text.split(/ (.+)/)[1]
  Containers.findOne
    channel_id: channel_id,
      (err, data) ->
        host = data.host
        request
          #url: "http://#{host}/exec"
          url:    "http://localhost:1515/exec"
          json:   true
          headers:
            'content-type': 'application/json'
          body:
            'command': command
            'response_url': response_url
          method: "POST",
            (err, response, body) ->
              if err
                console.log err

commit = (text, team_id, channel_id, response_url, userDoc) ->
  command = text.split(' ')[1]
  file    = text.split(' ')[2]
  switch command
    when "slip"
      request
        url: "https://slack.com/api/files.list"
        qs:
          token:    userDoc.oauth
          channel:  channel_id
        method: "POST",
          (err, response, body) ->
            result  = JSON.parse(body)
            downUrl = result.files[0].url_private
            headers =
              Authorization: "Bearer #{userDoc.oauth}"
            request
              url:      downUrl
              headers:  headers
              method:   "GET",
                (err, response, body) ->
                  params =
                    Bucket:           "testing-krate-slips"
                    Key:              "#{team_id}/#{file}.json"
                    ACL:              "private"
                    Body:             body
                    ContentLanguage:  "JSON"
                  s3.putObject params, (err, res) ->
                    if err
                      console.log err
                    else
                      Slips.findOneAndUpdate
                        team_id:    team_id
                        configName: file,
                          updatedAt: new Date()
                      .exec()
                      respond
                        "text": "Slip #{file} saved successfully."
                        "username": "Krate"
                        response_url

    when "file"
      request
        url: "https://slack.com/api/files.list"
        qs:
          token:    userDoc.oauth
          channel:  channel_id
        method: "POST",
          (err, response, body) ->
            result  = JSON.parse(body)
            downUrl = result.files[0].url_private
            Containers.findOne
              channel_id: channel_id,
                (err, data) ->
                  host = data.host
                  request
                    #url: "http://#{host}/commit"
                    url:  "http://localhost:1515/commit"
                    json: true
                    headers:
                      'content-type': 'application/json'
                    body:
                      url:          downUrl
                      file:         file
                      token:        userDoc.oauth
                      response_url: response_url
                    method: "POST",
                      (err, response, body) ->
                        if err
                          console.log err

    else
      respond
        "text": "Unknown command. Use [help] for usage."
        "username": "Krate"
        response_url

show = (text, team_id, channel_id, response_url, userDoc) ->
  file  = text.split(' ')[1]
  line  = text.split(' ')[2]
  start = line - 25
  end   = (line - 0) + 25
  Containers.findOne
    channel_id: channel_id,
      (err, data) ->
        host = data.host
        request
          #url: "http://#{host}/show"
          url: "http://localhost:1515/show"
          json: true
          headers:
            'content-type': 'application/json'
          body:
            file:         file
            start:        start
            end:          end
            response_url: response_url
          method: "POST",
            (err, response, body) ->
              if err
                console.log err

exportCmd = (text, team_id, channel_id, response_url, userDoc) ->
  Containers.findOne
    channel_id: channel_id,
      (err, data) ->
        host = data.host
        request
          #url: "http://#{host}/export"
          url: "http://localhost:1515/export"
          json: true
          headers:
            'content-type': 'application/json'
          body:
            container: data.container_id
            response_url: response_url
          method: "POST",
            (err, response, body) ->
              if err
                console.log err

stopCont = (container_id, team_id, channel_id, response_url) ->
  Containers.findOne
    container_id: container_id,
      (err, data) ->
        if err
          console.log err
        else
          if channel_id in data.channel_id
            Account.findOneAndUpdate
              team_id: team_id,
                $pull:
                  containers:
                    container_id: container_id,
                (err, data) ->
                      if err
                        console.log err
                      else
                        Containers.findOne
                          container_id: container_id
                        .remove().exec()
                        respond
                          "text": "Container #{container_id} is stopped."
                          "username": "Krate"
                          response_url
          else
            console.log 'This container is not in the channel requested'

deleteSlip = (slip, team_id, channel_id, response_url) ->
  Account.findOneAndUpdate
    team_id: team_id,
      $pull:
        slips: slip,
      (err, data) ->
        if err
          console.log err
        else
          Slips.findOne
            config_name: slip
            team_id:    team_id
          .remove().exec()
          respond
            "text": "Deleted slip '#{slip}'."
            "username": "Krate"
            response_url

respond = (body, response_url) ->
  request
    url:    response_url
    json:   true
    headers:
      'content-type': 'application/json'
    body: body
    method: "POST",
      (err, response, body) ->
        if err
          console.log err
