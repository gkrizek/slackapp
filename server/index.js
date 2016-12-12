var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
fs = require('fs');
var log = console.log;

var app = express();

const PORT=1515;

app.listen(PORT, function () {
    console.log("Krate listening on port " + PORT);
});

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
    res.send('Container is Working');
});

app.post('/exec', function(req, res){

});

app.post('/edit', function(req, res){

});

app.post('/commit', function(req, res){

});

app.post('/show', function(req, res){

});

app.post('/export', function(req, res){

});