var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');
var log = console.log;

client_id = process.env.CLIENT_ID;
client_secret = process.env.CLIENT_SECRET;
apiKey = process.env.API_KEY;

var app = express();

const PORT=8080;

app.listen(PORT, function () {
    console.log("Example app listening on port " + PORT);
});

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
    res.send('Slack App is Working');
});

app.get('/oauth', function(req, res) {
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        request({
            url: 'https://slack.com/api/oauth.access',
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret},
            method: 'GET', 
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);
            }
        })
    }


});

    app.post('/krate', function(req, res) {
        var text = req.body.text;
        var response_url = req.body.response_url;
        var channel_id = req.body.channel_id;
        var team_id = req.body.team_id;
        var command = text.split(' ')[0];
        res.send({"text": "Request received..."});
        switch(command){
            case "ssh":
                execute(text, team_id, response_url);
            case "init":
                init(text, channel_id, team_id, response_url);
            case "initsave":
                initsave(text, channel_id, team_id, response_url);
        }
    });


    function execute(text, team_id, response_url){
        var command = text.split(/ (.+)/)[1];
        exec(command, function(error, stdout, stderr) {
            if(stderr){
                var test = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stderr+"```","color": "#ff0000","mrkdwn_in": ["text"]}]};
                //res.send(test);
            }else if(error){
                console.log(error);
                var test = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"There was a problem","color": "#ff0000"}]};
                //res.send(test);
            }else{
                var body = {"text": "Response from Krate:","username": "Krate","attachments":[{"text":"```"+stdout+"```","color": "#36a64f","mrkdwn_in": ["text"]}]};
                log('sending');
                request({
                    url: response_url,
                    json: true,
                    headers: {'content-type': 'application/json'},
                    body: body,
                    method: 'POST'
                }, function (error, response, body) {
                    if (error) {
                        console.log(error);
                    } else {
                        log(body);
                    }
                });
            }
        });
    }

    function init(text, channel_id, team_id, response_url){
        var filename = text.split(/ (.+)/)[1];
        var file = "project_name: "+filename+"\ngit_url: GIT_URL";
        var token = apiKey;
        request({
            url: 'https://slack.com/api/files.upload',
            qs: {token: token, filename: filename, channels: channel_id, content: file},
            method: 'POST',
        }, function (error, response, body) {
            //log(JSON.parse(body));
        });
    }

    function initsave(text, channel_id, team_id, response_url){
        var token = apiKey;
        request({
            url: 'https://slack.com/api/files.list',
            qs: {token: token, channel: channel_id},
            method: 'POST',
        }, function (error, response, body) {
            var result = JSON.parse(body);
            var url = result.files[0].url_private;

            request({
                url: url,
                method: 'GET',
                headers: {'Authorization': "Bearer "+token}
            }, function (error, response, body) {
                fs.writeFile('../'+result.files[0].name, body, function(err){
                    if(err){
                        log(err);
                    }
                    notifySuccess(response_url);
                });
            });

        });
    }


    function notifySuccess(response_url){
        var body = {"text": "Successfully saved file!","username": "Krate"};
        request({
            url: response_url,
            json: true,
            headers: {'content-type': 'application/json'},
            body: body,
            method: 'POST'
        }, function (error, response, body) {
            if (error) {
               console.log(error);
            } else {
                log(body);
            }
        });
    }





