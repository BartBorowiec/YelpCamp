var mongoose = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose"),
    URLSlugs = require('mongoose-url-slugs');

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    avatar: String,
    firstName: String,
    lastName: String,
    email: String,
    isAdmin: {type: Boolean, default: false}
});

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(URLSlugs('username'));
module.exports = mongoose.model("User", UserSchema);