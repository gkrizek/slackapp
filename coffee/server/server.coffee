express     = require 'express'
request     = require 'request'
bodyParser  = require 'body-parser'
{exec}      = require 'child_process'
fs          = require 'fs'

awsKey      = process.env.AWS_KEY
awsSecret   = process.env.AWS_SECRET

app = express()

s3 = new S3
  region: "us-west-2"
  credentials:
    accessKeyId: awsKey
    secrectAccessKey: awsSecret

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
  response_url  = res.body.response_url
  container_id  = res.body.container_id
  command       = "tar -zcvf /tmp/#{container_id}.tgz ./"
  exec command, (error, stdout, stderr) ->
    if stderr
      console.log stderr
      respond
        "text": "There was a problem running that command"
        "username": "Krate"
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
      file      = "/tmp/#{container_id}.tgz"
      params    =
            Bucket: "testing-krate-export"
            Key: "#{container_id}.tgz"
            ACL: "private"
            Body: file
            ContentLanguage: "JSON"
      s3.putObject params, (err, res) ->
        if err
          console.log err
          respond
            "text": "There was a problem running that command."
            "username": "Krate"
            response_url
        else
          s3Url = "https://s3.amazonaws.com/testing-krate-export/#{container_id}.tgz"
          respond
            "text": "Successfully exported code. Download it at: #{s3Url}"
            "username": "Krate"
            response_url
          res.send 'OK'

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
