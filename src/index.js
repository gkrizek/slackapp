var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');

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

    app.post('/command', function(req, res) {
        console.log(req.body.text);
        var command = req.body.text;
        exec(command, function(error, stdout, stderr) {
            if(stderr){
                var test = {"text": "Response from Brix:","username": "Brix","attachments":[{"text":"```"+stderr+"```","color": "#ff0000","mrkdwn_in": ["text"]}]};
                res.send(test);
            }else if(error){
                console.log(error);
                var test = {"text": "Response from Brix:","username": "Brix","attachments":[{"text":"There was a problem","color": "#ff0000"}]};
                res.send(test);
            }else{
                var test = {"text": "Response from Brix:","username": "Brix","attachments":[{"text":"```"+stdout+"```","color": "#36a64f","mrkdwn_in": ["text"]}]};
                res.send(test);
            }
        });
    });


app.post('/test', function(req, res) {
    var token = "";
    var channel = req.body.channel_id;
    //console.log(channel);
    request({
        url: 'https://slack.com/api/files.info',
        //qs: {token: token, channel: channel},
        qs: {token: token, file: 'F3CAHK2MR'},
        method: 'GET',
    }, function (error, response, body) {
        //console.log(error);
        //console.log(response);
        var json = JSON.parse(body);
        console.log(json.file.url_private_download);
        //var url = json.file.url_private_download;
        var url = 'https://slack-files.com/T3C89DL30-F3CAHK2MR-5bb1baba51';
        var r = request(url);
        r.on('response',  function (res) {res.pipe(fs.createWriteStream('/Users/AppleUser/Desktop/file.js'));
});
    })
});


