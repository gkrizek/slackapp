var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');
var log = console.log;

var app = express();

const PORT=1515;

app.listen(PORT, function () {
    console.log("Krate listening on port " + PORT);
});

app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Container is Working');
});

app.get('')

app.post('/exec', function(req, res){
	var command = req.body.command;
	var response_url = req.body.response_url;
    exec(command, function(error, stdout, stderr) {
        if(stderr){
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stderr+"```","color": "#ff0000","mrkdwn_in": ["text"]}]};
            respond(body, response_url);
            res.send('OK');
        }else if(error){
            console.log(error);
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"There was a problem","color": "#ff0000"}]};
            respond(body, response_url);
            res.send('OK');
        }else{
        	var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stdout+"```","color": "#36a64f","mrkdwn_in": ["text"]}]};
            respond(body, response_url);
            res.send('OK');
        }
    });
});

app.post('/edit', function(req, res){
    var filename = req.body.file;
    var channel_id = req.body.channel_id;
    var token = req.body.token;
    fs.readFile('./'+filename, 'utf8', function(err,data){
        if(err){
            return log(err);
        }
        request({
            url: 'https://slack.com/api/files.upload',
            qs: {token: token, filename: filename, channels: channel_id, content: data},
            method: 'POST',
        }, function (error, response, body) {
            log(JSON.parse(body));
        });
    });
});

app.post('/commit', function(req, res){
    var url = req.body.url;
    var file = req.body.file;
    var response_url = req.body.response_url;
    var token = req.body.token;
    request({
        url: url,
        headers: {'Authorization': 'Bearer '+token},
        method: 'GET'
    }, function (error, response, body) {
        fs.writeFile('./'+file, body, function(err){
            if(err){
                log(err);
            }
            var body = {"text": file+" was successfully saved.", "username": "Krate"};
            respond(body, response_url);
        });
    });

});

app.post('/show', function(req, res){
    var start = req.body.start;
    var end = req.body.end;
    var file = req.body.file;
    var response_url = req.body.response_url;
    var command = "sed -n '"+start+","+end+"p' "+file;
    exec(command, function(error, stdout, stderr) {
        if(stderr){
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stderr+"```","color": "#ff0000","mrkdwn_in": ["text"]}]};
            respond(body, response_url);
            res.send('OK');
        }else if(error){
            console.log(error);
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"There was a problem","color": "#ff0000"}]};
            respond(body, response_url);
            res.send('OK');
        }else{
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stdout+"```","color": "#36a64f","mrkdwn_in": ["text"]}]};
            respond(body, response_url);
            res.send('OK');
        }
    });
});

app.post('/export', function(req, res){

});

function respond(body, response_url){
    request({
        url: response_url,
        json: true,
        headers: {'content-type': 'application/json'},
        body: body,
        method: 'POST'
    }, function (error, response, body) {
        if (error) {
            log(error);
        } else {
            log(body);
        }
    });
}

