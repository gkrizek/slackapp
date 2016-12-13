var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');
var log = console.log;
var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost:27017/krate');

clientId = process.env.CLIENT_ID;
clientSecret = process.env.CLIENT_SECRET;
apiKey = process.env.API_KEY;
verifyToken = process.env.VERIFY_TOKEN;

var app = express();

const PORT=8080;

app.listen(PORT, function () {
    console.log("Krate API listening on port " + PORT);
});

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
    res.send('Krate App is Working');
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
        var slackToken = req.body.token;
        if (!slackToken || slackToken != verifyToken){
            res.send('This request doesn\'t seem to be coming from Slack.');
        }else{
            var text = req.body.text;
            var response_url = req.body.response_url;
            var channel_id = req.body.channel_id;
            var team_id = req.body.team_id;
            var command = text.split(' ')[0];
            var helpCheck = text.split(' ')[1];
            switch(command){
                case "configure":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr configure <KEY>"});
                    }else{
                        res.send({"text": "Request received..."});
                        configure(text, team_id, channel_id, response_url);
                    }
                    break;
                case "krate":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr krate [start,stop,status,attach,detach] <SLIP_NAME>"});
                    }else{
                        res.send({"text": "Request received..."});
                        krate(text, team_id, channel_id, response_url);
                    }
                    break;
                case "slip":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr slip [list,create,edit,delete] <SLIP_NAME>"});
                    }else{
                        res.send({"text": "Request received..."});
                        slip(text, team_id, channel_id, response_url);
                    }
                    break;
                case "edit":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr edit <FILENAME>"});
                    }else{
                        res.send({"text": "Request received..."});
                        edit(text, team_id, channel_id, response_url);
                    }
                    break;
                case "exec":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr exec <COMMAND>"});
                    }else{
                        res.send({"text": "Request received..."});
                        execute(text, team_id, channel_id, response_url);
                    }
                    break;
                case "commit":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr commit [slip,file] <FILENAME>"});
                    }else{
                        res.send({"text": "Request received..."});
                        commit(text, team_id, channel_id, response_url);
                    }
                    break;
                case "show":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr show <FILENAME> <LINE_NUMBER>"});
                    }else{
                        res.send({"text": "Request received..."});
                        show(text, team_id, channel_id, response_url);
                    }
                    break;
                case "export":
                    if(helpCheck == 'help'){
                        res.send({"text": "Example: /kr export"});
                    }else{
                        res.send({"text": "Request received..."});
                        exportCmd(text, team_id, channel_id, response_url);
                    }
                    break;
                case "help":
                    res.send({"text": "Usage: /kr [configure, krate, slip, edit, commit, show, exec, export]"});
                    break;
                default:
                    res.send({"text": "Didn't understand that command. Use 'help' for usage."});
            }
        }
    });

    function configure(text, team_id, channel_id, response_url){
        var body = {"text": "This is the Configure command.","username": "Krate"};
        respond(body, response_url);
    }

    function krate(text, team_id, channel_id, response_url){
        var command = text.split(' ')[1];
        switch(command){
            case "status":
                var body = {"text": "This is the Krate Status.", "username": "Krate"};
                respond(body, response_url);
                break;
            case "start":
                var body = {"text": "Starting Krate...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "stop":
                var body = {"text": "If you really want to stop "+text.split(' ')[2]+" then call '/kr krate stop-force "+text.split(' ')[2]+"'. You might also want to export before stopping.", "username": "Krate"};
                respond(body, response_url);
                break;
            case "attach":
                var body = {"text": "Attaching Krate...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "detach":
                var body = {"text": "Detaching Krate...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "stop-force":
                var body = {"text": "Stoping Krate...", "username": "Krate"};
                respond(body, response_url);
                break;
            default:
                var body = {"text": "Unknown command. Use [help] for usage.", "username": "Krate"};
                respond(body, response_url);
        }
    }

    function slip(text, team_id, channel_id, response_url){
        var command = text.split(' ')[1];
        switch(command){
            case "list":
                var body = {"text": "Listing Slips...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "create":
                var filename = text.split(' ')[2];
                var file = "{\nproject_name: "+filename+",\ngit_url: GIT_URL\n}";
                var token = apiKey;
                request({
                    url: 'https://slack.com/api/files.upload',
                    qs: {token: token, filename: filename, channels: channel_id, content: file},
                    method: 'POST',
                }, function (error, response, body) {
                    //log(JSON.parse(body));
                });
                break;
            case "edit":
                var body = {"text": "Editing Slip...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "delete":
                var body = {"text": "If you really want to delete "+text.split(' ')[2]+" then call '/kr slip delete-force "+text.split(' ')[2]+"'", "username": "Krate"};
                respond(body, response_url);
                break;
            case "delete-force":
                var body = {"text": "Deleting Slip...", "username": "Krate"};
                respond(body, response_url);
                break;
            default:
                var body = {"text": "Unknown command. Use [help] for usage.", "username": "Krate"};
                respond(body, response_url);
        }
    }

    function edit(text, team_id, channel_id, response_url){
        var body = {"text": "This is the Edit command.","username": "Krate"};
        respond(body, response_url);
    };

    function execute(text, team_id, channel_id, response_url){
        var command = text.split(/ (.+)/)[1];
        request({
            url: 'http://localhost:1515/exec',
            json: true,
            headers: {'content-type': 'application/json'},
            body: {'command': command, 'response_url': response_url},
            method: 'POST'
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                log(body);
            }
        });
    };

    function commit(text, team_id, channel_id, response_url){
        var command = text.split(' ')[1];
        var file = text.split(' ')[2];
        //maybe have the option to not specify slip or file, and in that case, just commit most recent file in history. But how would you know what it goes to?
        switch(command){
            case "slip":
                var body = {"text": "Commiting slip "+file+"...","username": "Krate"};
                respond(body, response_url);
                break;
            case "file":
                var body = {"text": "Commiting file "+file+"...","username": "Krate"};
                respond(body, response_url);
                break;
            default:
                var body = {"text": "Unknown command. Use [help] for usage.", "username": "Krate"};
                respond(body, response_url);
        }
    };

    function show(text, team_id, channel_id, response_url){
        var body = {"text": "This is the Show command.","username": "Krate"};
        respond(body, response_url);
    };

    function exportCmd(text, team_id, channel_id, response_url){
        var body = {"text": "This is the Export command.","username": "Krate"};
        respond(body, response_url);
    };


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
            //log(body);
        }
    });
};


/*
    TESTING

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
                    //notifySuccess(response_url);
                });
            });

        });
    };
*/

