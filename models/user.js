var mongoose = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose"),
    URLSlugs = require('mongoose-url-slugs');

var UserSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    avatar: String,
    firstName: String,
    lastName: String,
    email: {type: String, unique: true, required: true},
    isAdmin: {type: Boolean, default: false},
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(URLSlugs('username'));
module.exports = mongoose.model("User", UserSchema);