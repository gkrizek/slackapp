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

app.post('/exec', function(req, res){
	var command = req.body.command;
	var response_url = req.body.response_url;
    exec(command, function(error, stdout, stderr) {
        if(stderr){
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stderr+"```","color": "#ff0000","mrkdwn_in": ["text"]}]};
            response(body, response_url);
        }else if(error){
            console.log(error);
            var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"There was a problem","color": "#ff0000"}]};
            response(body, response_url);
        }else{
        	var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stdout+"```","color": "#36a64f","mrkdwn_in": ["text"]}]};
            response(body, response_url);
        }
    });
});

app.post('/edit', function(req, res){

});

app.post('/commit', function(req, res){

});

app.post('/show', function(req, res){

});

app.post('/export', function(req, res){

});

function response(body, response_url){
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