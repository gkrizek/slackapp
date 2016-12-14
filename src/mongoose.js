var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost:27017/krate');
var Schema = mongoose.Schema;

var accountSchema = new Schema({
  _id: String,
  teamId: String,
  active: Boolean,
  accepted: Boolean,
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
  channelId: String,
  startTime: Date
});
var Containers = mongoose.model('Containers', containersSchema);

var slipsSchema = new Schema({
  _id: String,
  configName: String,
  url: String,
  teamId: String,
  channelId: String,
  createdAt: Date,
  updatedAt: Date
})
var Slips = mongoose.model('Slips', slipsSchema);

module.exports = {Account, Containers, Slips};

containersSchema.pre('save', function(next) {
  this.startTime = new Date();
  next();
});