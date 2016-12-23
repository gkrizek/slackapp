mongoose  = require 'mongoose'
mongoose.connect 'mongodb://localhost:27017/krate'
Schema    = mongoose.Schema

accountSchema = new Schema
  _id: String
  team_id: String
  team_name: String
  active: Boolean
  accepted: Boolean
  krateToken: String
  oauth: String
  plan: Number
  maxAllowedCont: Number
  runningCont: Number
  containers: Array
  slips: Array
  createdAt: Date
  lastUsed: Date

Account = mongoose.model 'Account', accountSchema

containersSchema = new Schema
  _id: String
  container_id: String
  host: String
  slip: String
  team_id: String
  channel_id: Array
  startTime: Date

Containers = mongoose.model 'Containers', containersSchema

slipsSchema = new Schema
  _id: String
  config_name: String
  url: String
  team_id: String
  createdAt: Date
  updatedAt: Date

Slips = mongoose.model 'Slips', slipsSchema

`module.exports = {Account, Containers, Slips}`


containersSchema.pre 'save', (next) ->
  this.startTime = new Date()
  next()
