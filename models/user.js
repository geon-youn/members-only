const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  member: { type: Boolean, required: true },
  admin: { type: Boolean, required: true },
});

User.virtual('fullname').get(function () {
  return this.fname + ' ' + this.lname;
});

module.exports = mongoose.model('User', User);
