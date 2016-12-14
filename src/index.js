var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');
var log = console.log;
var Account = require('./mongoose.js').Account;
var Containers = require('./mongoose.js').Containers;
var Slips = require('./mongoose.js').Slips;

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

app.post('/create-account', bodyParser.json(), function(req, res){
    var item = Account({
      _id: 'REAL',
      teamId: 'T3D6U95CL',
      active: true,
      password: 'password',
      auth: { token: 'test', verified: false},
      plan: 1,
      maxAllowedCont: 2,
      runningCont: 0,
      containers: [],
      slips: [],
      createdAt: new Date(),
      lastUsed: new Date()
    });
    item.save();
})

    app.post('/command', function(req, res) {
        var slackToken = req.body.token;
        if (!slackToken || slackToken != verifyToken){
            res.send('This request doesn\'t seem to be coming from Slack.');
        }else{
            var text = req.body.text;
            var response_url = req.body.response_url;
            var channel_id = req.body.channel_id;
            //D3D6U9604
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
                Account.findOne({'teamId': team_id}, 'containers', function(err, res){
                    if(err){
                        log(err);
                        var body = {"text": "There was a problem processing your request.", "username": "Krate"};
                        respond(body, response_url);
                    }else{
                        if(res.containers.length == 0){
                            var body = {"text": "You don't have any containers running in the channel.", "username": "Krate"};
                        }else{
                            //check if any containers match channel. If so, return info.
                            var body = {"text": "This is the Krate Status.", "username": "Krate"};
                        }
                        respond(body, response_url);
                    }
                });
                break;
            case "start":
                var slip = text.split(' ')[2];
                //var body = {"text": "Starting Krate...", "username": "Krate"};
                var containerId = 'ssdfasdfadfad';
                var newCont = Containers({
                    _id: 'ABCSesdfe123',
                    containerId: containerId,
                    host: '10.9.9.2',
                    slip: slip,
                    teamId: team_id,
                    channelId: channel_id
                });
                newCont.save(function(err){
                    if(err) {
                        log(err);
                    }
                    log('Created!');
                });
                var body = {"text": "Starting Krate "+containerId+"...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "stop":
                //maybe use the Slack decision buttons here
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
                Account.findOne({'teamId': team_id}, 'slips', function(err, res){
                    if(err){
                        log(err);
                        var body = {"text": "There was a problem processing your request.", "username": "Krate"};
                        respond(body, response_url);
                    }else{
                        if(res.slips.length == 0){
                            var body = {"text": "You don't have any slips. Create one with '/kr slip create <NAME>'", "username": "Krate"};
                        }else{
                            //Return all the slips
                            var body = {"text": "Listing Slips...", "username": "Krate"};
                        }
                        respond(body, response_url);
                    }
                });
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
        var file = text.split(' ')[1];
        request({
            url: 'http://localhost:1515/edit',
            json: true,
            headers: {'content-type': 'application/json'},
            body: {'file': file, 'channel_id': channel_id, 'token': apiKey},
            method: 'POST'
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                log(body);
            }
        });
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
                request({
                    url: 'https://slack.com/api/files.list',
                    qs: {token: apiKey, channel: channel_id},
                    method: 'POST'
                }, function(err, response, body){
                    var result = JSON.parse(body);
                    log(result);
                    var downUrl = result.files[0].url_private;
                    log(downUrl);
                    request({
                        url: 'http://localhost:1515/commit',
                        json: true,
                        headers: {'content-type': 'application/json'},
                        body: {'url': downUrl, 'file': file, 'token': apiKey,'response_url': response_url},
                        method: 'POST'
                    }, function (error, response, body) {
                        if (error) {
                            console.log(error);
                        } else {
                            //log(body);
                        }
                    });
                })
                break;
            default:
                var body = {"text": "Unknown command. Use [help] for usage.", "username": "Krate"};
                respond(body, response_url);
        }
    };

    function show(text, team_id, channel_id, response_url){
        //Need to be able to handle small files. Maybe have the user specify the range. IE 10-70.
        var file = text.split(' ')[1];
        var line = text.split(' ')[2];
        var start = line - 25;
        var end = (line - 0) + 25;        
        request({
            url: 'http://localhost:1515/show',
            json: true,
            headers: {'content-type': 'application/json'},
            body: {'file': file, 'start': start, 'end': end, 'response_url': response_url},
            method: 'POST'
        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                log(body);
            }
        });    
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

