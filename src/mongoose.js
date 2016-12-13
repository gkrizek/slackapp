var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost:27017/krate');
var Schema = mongoose.Schema;

var accountSchema = new Schema({
  id: String,
  teamId: String,
  active: Boolean,
  password: String,
  auth: { token: String, verified: Boolean},
  plan: Number,
  maxAllowedCont: Number,
  runningCont: Number,
  containers: Array,
  slips: Array,
  createdAt: Date,
  lastUsed: Date
});
var Account = mongoose.model('Account', accountSchema);
module.exports = Account;

var containersSchema = new Schema({
  id: String,
  containerId: String,
  host: String,
  slip: String,
  teamId: String,
  channelId: String,
  startTime: Date
});
var Containers = mongoose.model('Containers', containersSchema);
module.exports = Containers;

var slipsSchema = new Schema({
  id: String,
  configName: String,
  url: String,
  teamId: String,
  channelId: String,
  createdAt: Date,
  updatedAt: Date
})
var Slips = mongoose.model('Slips', slipsSchema);
module.exports = Slips;
