var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;

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
                res.send(stderr);
            }else if(error){
                console.log(error);
                res.send('There was a problem');
            }else{
                var test = {"text": "Response from Brix:","attachments":[{"text":"```"+stdout+"```", "mrkdwn_in": ["text"]}]};
                //result.send(stdout);
                res.send(test);
            }
        });
    });


