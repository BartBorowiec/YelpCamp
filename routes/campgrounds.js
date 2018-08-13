var express = require("express"),
    router = express.Router(),
    Campground = require("../models/campground"),
    middleware = require("../middleware"),
    NodeGeocoder = require('node-geocoder'),
    slugify = require('slugify');
    
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, callback) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'bartborowiec', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

// //INDEX - show all campgrounds
// router.get("/", function(req, res){
//     var noMatch = null;
//     if(req.query.search) {
//         const regex = new RegExp(escapeRegex(req.query.search), 'gi');
//         // Get all campgrounds from DB
//         Campground.find({name: regex}, function(err, allCampgrounds){
//           if(err){
//               console.log(err);
//           } else {
//               if(allCampgrounds.length < 1) {
//                   noMatch = "No campgrounds match that query, please try again.";
//               }
//               res.render("campgrounds/index",{campgrounds:allCampgrounds, noMatch: noMatch});
//           }
//         });
//     } else {
//         // Get all campgrounds from DB
//         Campground.find({}, function(err, allCampgrounds){
//           if(err){
//               console.log(err);
//           } else {
//               res.render("campgrounds/index",{campgrounds:allCampgrounds, noMatch: noMatch});
//           }
//         });
//     }
// });
    //INDEX - show all campgrounds
    router.get("/", function(req, res){
        var perPage = 8;
        var pageQuery = parseInt(req.query.page);
        var pageNumber = pageQuery ? pageQuery : 1;
        var noMatch = null;
        if(req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), 'gi');
            Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
                Campground.count({name: regex}).exec(function (err, count) {
                    if (err) {
                        console.log(err);
                        res.redirect("back");
                    } else {
                        if(allCampgrounds.length < 1) {
                            noMatch = "No campgrounds match that query, please try again.";
                        }
                        res.render("campgrounds/index", {
                            campgrounds: allCampgrounds,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            noMatch: noMatch,
                            search: req.query.search
                        });
                    }
                });
            });
        } else {
            // get all campgrounds from DB
            Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
                Campground.count().exec(function (err, count) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.render("campgrounds/index", {
                            campgrounds: allCampgrounds,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            noMatch: noMatch,
                            search: false
                        });
                    }
                });
            });
        }
    });

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var price = req.body.price;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
          req.flash('error', 'Invalid address');
          return res.redirect('back');
        }
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;
        cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            var newCampground = {name: name, image: result.secure_url, imageId: result.public_id, price: price, description: desc, author:author, location: location, lat: lat, lng: lng};
            // Create a new campground and save to DB
            Campground.create(newCampground, function(err, newlyCreated){
                if(err){
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //redirect back to campgrounds page
                console.log(newlyCreated);
                res.redirect("/campgrounds/"+ newlyCreated.slug);
            });
        });
    });
});

// NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new");
});

// SHOW - shows more info about one campground
router.get("/:slug", function(req, res) {
    //find the campground with provided ID
    Campground.findOne({slug: req.params.slug}).populate("comments").populate("author.id").exec(function(err, foundCampground) {
        if (err) {
            console.log(err);
        } else {
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:slug/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, foundCampground) {
        if(err){
            req.flash("error", "Campground not found");
            return res.redirect("/campgrounds");
        }
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});
    
// UPDATE CAMPGROUND ROUTE
router.put("/:slug", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res) {
    geocoder.geocode(req.body.campground.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        Campground.findOne({slug: req.params.slug}, async function(err, campground) {
            if(err){
                req.flash("error", err.message);
                res.redirect("back");
            } else {
                if (req.file) {
                    try {
                        await cloudinary.v2.uploader.destroy(campground.imageId);
                        var result = await cloudinary.v2.uploader.upload(req.file.path);
                        campground.imageId = result.public_id;
                        campground.image = result.secure_url;
                    } catch(err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                }
                campground.name = req.body.campground.name;
                campground.description = req.body.campground.description;
                campground.price = req.body.campground.price;
                campground.lat = data[0].latitude;
                campground.lng = data[0].longitude;
                campground.location = data[0].formattedAddress;
                campground.slug = slugify(req.body.campground.name);
                campground.save();
                req.flash("success","Successfully Updated!");
                res.redirect("/campgrounds/" + campground.slug);
            }
        });
    });
});

//DESTROY CAMPGROUND ROUTE
router.delete("/:slug", middleware.checkCampgroundOwnership, async function(req,res) {
    Campground.findOne({slug: req.params.slug}, async function(err, campground){
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(campground.imageId);
            campground.remove();
            req.flash("success", "Deleted a campground");
            res.redirect("/campgrounds");
        } catch(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;