var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');
var log = console.log;
//  Stored in Environment Variables
//var clientId = '';
//var clientSecret = '';

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
        var team_id = req.body.team_id;
        var command = text.split(' ')[0];
        res.send({"text": "Request received..."});
        switch(command){
            case "ssh":
                execute(text, team_id, response_url);
            case "init":
                init(text);
        }
    });


    function execute(text, team_id, response_url){
        var command = text.split(/ (.+)/)[1]
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
                })


            }
        });
    }

    function init(text){

    }



app.post('/test', function(req, res) {
    var token = "";
    var channel = req.body.channel_id;
    //console.log(channel);
    request({
        url: 'https://slack.com/api/files.info',
        //qs: {token: token, channel: channel},
        qs: {token: token, file: 'F3DQM35QF'},
        method: 'GET',
    }, function (error, response, body) {
        //console.log(error);
        //console.log(response);
        var json = JSON.parse(body);
        console.log(json);
        //var url = json.file.url_private_download;
        var url = 'https://files.slack.com/files-pub/T3C89DL30-F3DQM35QF/download/testing.js';
        var r = request(url);
        r.on('response',  function (res) {res.pipe(fs.createWriteStream('/Users/AppleUser/Desktop/file.js'));});
    //})
});
});

app.post('/upload', function(req, res) {
    var token = "";
    var channel = req.body.channel_id;
    var command = req.body.text;
    var file = fs.readFileSync(command).toString();
    request({
        url: 'https://slack.com/api/files.upload',
        qs: {token: token, filename: command, channels: channel, content: file},
        method: 'POST',
    }, function (error, response, body) {
        log(JSON.parse(body));
    });

});


