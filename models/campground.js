var mongoose = require("mongoose"),
    URLSlugs = require('mongoose-url-slugs');
var campgroundSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    imageId: String,
    description: String,
    location: String,
    lat: Number,
    lng: Number,
    createdAt: { type: Date, default: Date.now },
    comments: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
        }
    ],
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username: String
    }
});

campgroundSchema.plugin(URLSlugs('name'));
module.exports = mongoose.model("Campground", campgroundSchema);