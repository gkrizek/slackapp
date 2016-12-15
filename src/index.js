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
                var doesExist = Account.count({'teamId': body.team_id});
                if(doesExist > 0){
                    //updated already existsing document to Active.
                }else{
                    var result = JSON.parse(body);
                    var id = randomstring.generate();
                    var oauth = result.access_token;
                    var team_name = result.team_name;
                    var team_id = result.team_id;
                    var newAccount = Account({
                      _id: id,
                      teamId: team_id,
                      teamName: team_name,
                      active: true,
                      accepted: false,
                      krateToken: null,
                      oauth: oauth,
                      plan: 0,
                      maxAllowedCont: 0,
                      runningCont: 0,
                      containers: [],
                      slips: [],
                      createdAt: new Date()
                    });
                    newAccount.save();
                }
                res.redirect('https://slack.com');
            }
        })
    }
});

app.post('/message_action', function(req, res){
    var result = JSON.parse(req.body.payload);
    var callback_id = result.callback_id;
    var action = result.actions[0].name;
    var value = result.actions[0].value;
    var channel_id = result.channel.id;
    var response_url = result.response_url;
    var slackToken = result.token;
    if (!slackToken || slackToken != verifyToken){
        res.send('This request doesn\'t seem to be coming from Slack.');
    }else{
        switch(callback_id){
            case "stop_cont":
                if(action == "yes"){
                    stopCont(value, channel_id, response_url);  //need CB?
                    res.send({"text": "Stopping krate '"+value+"'.", "username": "Krate"});
                }else{
                    res.send({"text": "Leaving krate '"+value+"' alone.", "username": "Krate"});
                }
                break;
            case "delete_slip":
                res.send({"text": "ok"})
                break;
            default:
                res.send({"text": "I didn't understand that option.", "username": "Krate"});
        }
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
            Account.findOne({'teamId': team_id}, function(err, data){
                //what if it can't find it? ie data null?
                if (err){
                    log(err);
                }else{
                    var userDoc = data;
                    if(userDoc.accepted == false && command != 'configure'){
                        var body = {"text": "It doesn't look like you have configured Slack with your Krate account. Please create an account at https://krate.sh and run the '/kr configure' command.", "username": "Krate"};
                        res.send(body);
                    }else if(userDoc.active == false){
                        var body = {"text": "It looks like your account is not active. Please login to your account at https://krate.sh/login to find out why.", "username": "Krate"};
                        res.send(body);
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
        }
});

    function configure(text, team_id, channel_id, response_url, userDoc){
        var krateToken = text.split(' ')[1];
        //Call to main site to link their Slack Team to their Krate account
        if(userDoc.accepted == true){
            var body = {"text": "You have already configured your Slack team with you Krate account.","username": "Krate"};
            respond(body, response_url);
        }else{
            if(!krateToken){
                var body = {"text": "You must pass a token. Example: '/kr configure abc123def456","username": "Krate"};
                respond(body, response_url);
            }else{
                var body = {"text": "This is the Configure command with "+krateToken,"username": "Krate"};
                respond(body, response_url);
            }
        }
    }

    function krate(text, team_id, channel_id, response_url, userDoc){
        var command = text.split(' ')[1];
        switch(command){
            case "status":
                var length = userDoc.containers.length;
                if(length == 0){
                    var body = {"text": "You don't have any containers running in the channel.", "username": "Krate"};
                    respond(body, response_url);
                }else{
                    //this should be the most effieicnt, but I could possibly look in the containers collection matching channel id.
                    for(var i = 0; i < length; i++){
                        if(userDoc.containers[i].channel == channel_id){
                            var body = {"text": "Current running container: "+userDoc.containers[i].name, "username": "Krate"};
                            break;
                        }else{
                            var body = {"text": "You don't have any containers running in the channel.", "username": "Krate"};
                        }
                        respond(body, response_url);
                    }
                }
                break;
            case "start":
                var slip = text.split(' ')[2];
                var id = randomstring.generate();
                var containerId = randomstring.generate(10);
                if(!slip){
                    var body = {"text": "You must specify a slip to boot with. Example: '/kr krate start bear'", "username": "Krate"};
                    respond(body, response_url);
                }else{
                    var newCont = Containers({
                        _id: id,
                        containerId: containerId,
                        host: '10.9.9.2',
                        slip: slip,
                        teamId: team_id,
                        channelId: channel_id
                    });
                    newCont.save(function(err){
                        Account.findOneAndUpdate({'teamId': team_id}, {'containers': [{'channelId': channel_id, 'containerId': containerId}]}, function(err, data){
                            if (err) log(err);
                            var body = {"text": "Starting Krate "+containerId+"...", "username": "Krate"};
                            respond(body, response_url);
                        });
                    });
                }
                break;
            case "stop":
                var cont = text.split(' ')[2];
                if(!cont){
                    var body = {"text": "You must specify a container to stop. Use '/kr krate status' to find running containers", "username": "Krate"};
                    respond(body, response_url);             
                }else{
                    var body = {"text": "Are you sure you want to stop "+cont+"?", "attachments": [{"text": "You might want to export your code changes first.", "fallback": "Won't Delete the container.", "callback_id": "stop_cont", "color": "#ab32a4", "attachment_type": "default", "actions": [{"name": "yes", "text": "Obliterate it.", "type": "button", "value": cont},{"name": "no", "text": "Don't touch it!", "type": "button", "value": cont}]}]}
                    respond(body, response_url);
                }
                break;
            case "attach":
                var body = {"text": "Attaching Krate...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "detach":
                var body = {"text": "Detaching Krate...", "username": "Krate"};
                respond(body, response_url);
                break;
            default:
                var body = {"text": "Unknown command. Use [help] for usage.", "username": "Krate"};
                respond(body, response_url);
        }
    }

    function slip(text, team_id, channel_id, response_url, userDoc){
        var command = text.split(' ')[1];
        //Maybe need a RENAME command
        log(userDoc)
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
                var id = randomstring.generate();
                var filename = text.split(' ')[2];
                var s3 = 'https://s3.amazonaws.com/slips/'+team_id+'/'+filename+'.json';
                var file = "{\n\tproject_name: "+filename+",\n\tgit_url: <git-url>,\n\tgit_branch: <git-branch>\n}";
                var token = userDoc.oauth;
                request({
                    url: 'https://slack.com/api/files.upload',
                    qs: {token: token, filename: filename, channels: channel_id, content: file},
                    method: 'POST',
                }, function (error, response, body) {
                    if(error){
                        log(error);
                    }
                });
                var newSlip = Slips({
                    _id: id,
                    configName: filename,
                    url: s3,
                    teamId: team_id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                newSlip.save();
                break;
            case "edit":
                var body = {"text": "Editing Slip...", "username": "Krate"};
                respond(body, response_url);
                break;
            case "delete":
            //Use buttons here instead
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
            body: {'file': file, 'channel_id': channel_id, 'token': userDoc.oauth},
            method: 'POST'
        }, function (error, response, body) {
            if (error) {
                log(error);
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
                log(error);
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
                    qs: {token: userDoc.oauth, channel: channel_id},
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
                        body: {'url': downUrl, 'file': file, 'token': userDoc.oauth,'response_url': response_url},
                        method: 'POST'
                    }, function (error, response, body) {
                        if (error) {
                            log(error);
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
                log(error);
            }
        });    
    };

    function exportCmd(text, team_id, channel_id, response_url, userDoc){
        var body = {"text": "This is the Export command.","username": "Krate"};
        respond(body, response_url);
    };

    function stopCont(containerId, channelId, response_url){
        //check if container matches channel then stop and delete records
        log("deleting containter");
    };

    function deleteSlip(slip, channelId, response_url){
        //check if container matches channel then stop and delete records
        log("deleting slip");
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
        }
    });
};

