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

    app.post('/command', function(req, result) {
    	run(req, function(err, res){
    		if(err){
    			console.log(err);
    		}else{
    			console.log(res);
    			result.send(res);
    		}
    	})
    });
});


function run(command, callback) {
	exec(command, function(error, stdout, stderr) {
		if(stderr){
			return stderr;
		}else if(stdout){
			return stdout;
		}else{
			return error;
		}
	});
}