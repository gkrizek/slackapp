express     = require 'express'
request     = require 'request'
bodyParser  = require 'body-parser'
{exec}      = require 'child_process'
fs          = require 'fs'

app = express()

port = 1515

app.listen port

app.use bodyParser.json()

app.get '/', (req, res) ->
  res.send 'Container is working...'

app.post '/exec', (req, res) ->
  command       = req.body.command
  response_url  = req.body.response_url
  exec command, (error, stdout, stderr) ->
    if stderr
      respond
        "text": "Response from Krate:"
        "username": "Krate"
        "attachments": [
          "text": "```#{stderr}```"
          "color": "#ff0000"
          "mrkdwn_in": [
            "text"
          ]
        ]
        response_url
      res.send 'OK'
    else if error
      console.log error
      respond
        "text": "There was a problem running that command"
        "username": "Krate"
        response_url
      res.send 'OK'
    else
      respond
        "text": "Response from Krate:"
        "username": "Krate"
        "attachments": [
          "text": "```#{stdout}```"
          "color": "#ff0000"
          "mrkdwn_in": [
            "text"
          ]
        ]
        response_url
      res.send 'OK'

app.post '/edit', (req, res) ->
  filename    = req.body.file
  channel_id  = req.body.channel_id
  token       = req.body.token
  fs.readFile "./#{filename}", 'utf8', (err, data) ->
    if err
      console.log err
    else
      request
        url:  "https://slack.com/api/files.upload"
        qs:
          token:    token
          filename: filename
          channels: channel_id
          content:  data
        method: "POST",
          (err, response, body) ->
            console.log JSON.parse(body)

app.post '/commit', (req, res) ->
  url           = req.body.url
  file          = req.body.file
  response_url  = req.body.response_url
  token         = req.body.token
  headers       =
    Authorization:  "Bearer #{token}"
  request
    url:      url
    headers:  headers
    method:   "GET",
      (err, response, body) ->
        if err
          console.log err
        else
          fs.writeFile "./#{file}", body, (err) ->
            if err
              console.log err
            else
              respond
                "text": "File #{file} was successfully saved."
                "username": "Krate"

app.post '/show', (req, res) ->
  start         = req.body.start
  end           = req.body.end
  file          = req.body.file
  response_url  = req.body.response_url
  command       = "sed -n '#{start},#{end}p' #{file}"
  exec command, (error, stdout, stderr) ->
    if stderr
      respond
        "text": "Response from Krate:"
        "username": "Krate"
        "attachments": [
          "text": "```#{stderr}```"
          "color": "#ff0000"
          "mrkdwn_in": [
            "text"
          ]
        ]
        response_url
      res.send 'OK'
    else if error
      console.log error
      respond
        "text": "There was a problem running that command"
        "username": "Krate"
        response_url
      res.send 'OK'
    else
      respond
        "text": "Response from Krate:"
        "username": "Krate"
        "attachments": [
          "text": "```#{stdout}```"
          "color": "#ff0000"
          "mrkdwn_in": [
            "text"
          ]
        ]
        response_url
      res.send 'OK'

app.post '/export', (req, res) ->
  respond
    "text": "this is the export command"
    "username": "Krate"

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
