var express = require('express');
var request = require('request');
var exec = require('child_process').exec;

//  Stored in Environment Variables
//var clientId = '';
//var clientSecret = '';

var app = express();

const PORT=8080;

app.listen(PORT, function () {
    console.log("Example app listening on port " + PORT);
});

app.get('/', function(req, res) {
    res.send('Slack App is Working');
});

app.get('/oauth', function(req, res) {
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        //console.log(req);
        request({
            url: 'https://slack.com/api/oauth.access',
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret},
            method: 'GET', 
        }, function (error, response, body) {
            //console.log(response);
            //console.log(body);
            if (error) {
                console.log(error);
            } else {
                res.json(body);
            }
        })
    }


});

    app.post('/command', function(req, result) {
        console.log(req.route);
        var command = "pwd";
        exec(command, function(error, stdout, stderr) {
            if(stderr){
                result.send(stderr);
            }else if(error){
                console.log(error);
                result.send('There was a problem');
            }else{
                var test = {"text": "It\'s 80 degrees right now.","attachments":[{"text":"```Partly cloudy today and tomorrow```"}]};
                //result.send(stdout);
                result.send(test);
            }
        });
    });


