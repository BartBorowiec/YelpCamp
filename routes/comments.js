var express = require("express");
var router = express.Router({mergeParams: true});
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware");

//Comments New
router.get("/new", middleware.isLoggedIn, function(req, res) {
    Campground.findOne({slug: req.params.slug}, function(err, foundCampground) {
        if (err) {
            console.log(err);
        } else {
            res.render("comments/new", {campground: foundCampground});
        }
    });
});

//Comments Create
router.post("/", middleware.isLoggedIn, function(req, res) {
  Campground.findOne({slug : req.params.slug}, function(err, foundCampground) {
    if (err) {
        console.log(err);
        res.redirect("/campgrounds");
    } else {
        Comment.create(req.body.comment, function(err,comment) {
           if (err) {
               req.flash("error", "Something went wrong");
           } else {
               //add username and id to comment
               comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               foundCampground.comments.push(comment);
               foundCampground.save();
               req.flash("success", "Successfully added a comment");
               res.redirect("/campgrounds/" + foundCampground.slug);
           }
        });
    }
  });
});

//Comments Edit
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res) {
    Comment.findById(req.params.comment_id, function(err, foundComment){
        if (err) {
            res.redirect("back");
        } else {
            res.render("comments/edit", {campground_slug: req.params.slug, comment: foundComment});
        }
    });
});
//Comments Update
router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment) {
        if(err) {
            res.redirect("back");
        } else {
            req.flash("success", "Successfully updated a comment");
            res.redirect("/campgrounds/" + req.params.slug);
        }
    });
});

//Comments Destroy
router.delete("/:comment_id", middleware.isLoggedIn, middleware.checkCommentOwnership, function(req, res){
  // find campground, remove comment from comments array, delete comment in db
  Campground.findOneAndUpdate({slug: req.params.slug}, {
    $pull: {
      comments: req.params.comment_id
    }
  }, function(err) {
    if(err){ 
        console.log(err);
        req.flash('error', err.message);
        res.redirect('/');
    } else {
        Comment.findByIdAndRemove(req.params.comment_id, function(err) {
          if(err) {
            req.flash('error', err.message);
            return res.redirect('/');
          }
          req.flash('error', 'Comment deleted!');
          res.redirect("/campgrounds/" + req.params.slug);
        });
    }
  });
});

module.exports = router;
