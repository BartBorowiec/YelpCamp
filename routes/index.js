var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");

//root route
router.get("/", function(req, res) {
    res.render("landing");
});

//show register form
router.get("/register", function(req, res){
    res.render("register", {page: 'register'});
});

//handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar
    });
    if (req.body.adminCode === 'LubiePlacki123') {
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp " + user.username);
            res.redirect("/campgrounds");
        });
    });
});

//show login form
router.get("/login", function(req, res){
    res.render("login", {page: 'login'});
});

//handle login logic
router.post("/login",
    passport.authenticate("local", 
    {
        successRedirect:"/campgrounds",
        failureRedirect:"/login",
        failureFlash:"Invalid username or password",
        successFlash:"Logged you in"
    }
    ), function(req,res){
});

//show user profile
router.get("/users/:slug", function(req, res){
    User.findOne({slug: req.params.slug}, function(err, foundUser){
        if (err) {
            req.flash("error", "Something went wrong.");
            res.redirect("/campgrounds");
        } else {
            res.render("users/show", {user: foundUser});
        }
    });
});

//logout route
router.get("/logout", function(req,res){
    req.logout();
    req.flash("success", "Logged you out");
    res.redirect("/campgrounds");
});

module.exports = router;