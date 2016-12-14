var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var randomstring = require("randomstring");
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
                //Check if they have added the app before. If they have use old doc and update status of it
                var id = randomstring.generate();
                var oauth = body.token;
                var team_id = body.team_id;
                var newAccount = Account({
                  _id: id,
                  teamId: team_id,
                  active: true,
                  accepted: false,
                  oauth: oauth,
                  plan: 0,
                  maxAllowedCont: 0,
                  runningCont: 0,
                  containers: [],
                  slips: [],
                  createdAt: new Date()
                });
                newAccount.save();
                res.send('OK');
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
            var userDoc = Account.findOne({'teamId': team_id});
            if(userDoc.accepted == false && command != 'configure'){
                var body = {"text": "It doesn't look like you have configured Slack with your Krate account. Please create an account at https://krate.sh and run the '/kr configure' command.", "username": "Krate"};
                respond(body, response_url);
            }else if(userDoc.active == false){
                var body = {"text": "It looks like your account is not active. Please login to your account at https://krate.sh/login to find out why.", "username": "Krate"};
                respond(body, response_url);
            }else{
                switch(command){
                    case "configure":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr configure <KEY>"});
                        }else{
                            res.send({"text": "Request received..."});
                            configure(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "krate":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr krate [start,stop,status,attach,detach] <SLIP_NAME>"});
                        }else{
                            res.send({"text": "Request received..."});
                            krate(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "slip":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr slip [list,create,edit,delete] <SLIP_NAME>"});
                        }else{
                            res.send({"text": "Request received..."});
                            slip(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "edit":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr edit <FILENAME>"});
                        }else{
                            res.send({"text": "Request received..."});
                            edit(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "exec":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr exec <COMMAND>"});
                        }else{
                            res.send({"text": "Request received..."});
                            execute(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "commit":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr commit [slip,file] <FILENAME>"});
                        }else{
                            res.send({"text": "Request received..."});
                            commit(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "show":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr show <FILENAME> <LINE_NUMBER>"});
                        }else{
                            res.send({"text": "Request received..."});
                            show(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "export":
                        if(helpCheck == 'help'){
                            res.send({"text": "Example: /kr export"});
                        }else{
                            res.send({"text": "Request received..."});
                            exportCmd(text, team_id, channel_id, response_url, userDoc);
                        }
                        break;
                    case "help":
                        res.send({"text": "Usage: /kr [configure, krate, slip, edit, commit, show, exec, export]"});
                        break;
                    default:
                        res.send({"text": "Didn't understand that command. Use 'help' for usage."});
                }
            }
        }
    });

    function configure(text, team_id, channel_id, response_url, userDoc){
        var krateToken = text.split(' ')[1];
        //Call to main site to link their Slack Team to their Krate account
        var body = {"text": "This is the Configure command.","username": "Krate"};
        respond(body, response_url);
    }

    function krate(text, team_id, channel_id, response_url, userDoc){
        var command = text.split(' ')[1];
        switch(command){
            case "status":
                Account.findOne({'teamId': team_id}, 'containers', function(err, res){
                    if(err){
                        log(err);
                        var body = {"text": "There was a problem processing your request.", "username": "Krate"};
                        respond(body, response_url);
                    }else{
                        var length = res.container.length;
                        if(length == 0){
                            var body = {"text": "You don't have any containers running in the channel.", "username": "Krate"};
                        }else{
                            for(var i = 0; i < length; i++){
                                if(res.container[i].channel == channel_id){
                                    var body = {"text": "Current running container: "+res.container[i].name, "username": "Krate"};
                                    break;
                                }else{
                                    var body = {"text": "You don't have any containers running in the channel.", "username": "Krate"};
                                }
                            }
                            respond(body, response_url);
                        }
                    }
                });
                break;
            case "start":
                var slip = text.split(' ')[2];
                var id = randomstring.generate();
                var containerId = randomstring.generate(10);
                var newCont = Containers({
                    _id: id,
                    containerId: containerId,
                    host: '10.9.9.2',
                    slip: slip,
                    teamId: team_id,
                    channelId: channel_id
                });
                newCont.save();
                var body = {"text": "Starting Krate "+containerId+"...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "stop":
                //maybe use the Slack decision buttons here
                var body = {"text": "Are you sure you want to stop "+text.split(' ')[2]+"?", "username": "Krate"};
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

    function slip(text, team_id, channel_id, response_url, userDoc){
        var command = text.split(' ')[1];
        switch(command){
            case "list":
                if(userDoc.slips.length == 0){
                    var body = {"text": "You don't have any slips. Create one with '/kr slip create <NAME>'", "username": "Krate"};   
                }else{
                    /*var slipArr = [];
                    for(var i = 0; i < userDoc.slips.length; i++){
                        slipArr.push(userDoc.slips[i]);
                    }*/
                    //Maybe snippet instead
                    var body = {"text": "Current Slips: "+userDoc.slips, "username": "Krate"};
                }
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

    function edit(text, team_id, channel_id, response_url, userDoc){
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

    function execute(text, team_id, channel_id, response_url, userDoc){
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

    function commit(text, team_id, channel_id, response_url, userDoc){
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

    function show(text, team_id, channel_id, response_url, userDoc){
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

    function exportCmd(text, team_id, channel_id, response_url, userDoc){
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

