var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/krate');
var Schema = mongoose.Schema;

/*
--  For Containers and Channels --
A container can exist in multiple channels, but a channel can not have multiple conaintainers

So the Contianer collection will use an array for channelIds, but the Account collection will just add another object to the array with the same container id but different cahnnel id
*/


var accountSchema = new Schema({
  _id: String,
  teamId: String,
  teamName: String,
  active: Boolean,
  accepted: Boolean,
  krateToken: String,
  oauth: String,
  plan: Number,
  maxAllowedCont: Number,
  runningCont: Number,
  containers: Array,
  slips: Array,
  createdAt: Date,
  lastUsed: Date
});
var Account = mongoose.model('Account', accountSchema);

var containersSchema = new Schema({
  _id: String,
  containerId: String,
  host: String,
  slip: String,
  teamId: String,
  channelId: Array,
  startTime: Date
});
var Containers = mongoose.model('Containers', containersSchema);

var slipsSchema = new Schema({
  _id: String,
  configName: String,
  url: String,
  teamId: String,
  createdAt: Date,
  updatedAt: Date
})
var Slips = mongoose.model('Slips', slipsSchema);

module.exports = {Account, Containers, Slips};

containersSchema.pre('save', function(next) {
  this.startTime = new Date();
  next();
});