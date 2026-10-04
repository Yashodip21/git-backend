const express = require("express");

const userController = require("../controllers/userController");
const repoController = require("../controllers/repoController");
const authMiddleware = require('../middleware/authMiddleware');
const userRouter=express.Router();


userRouter.get("/allUsers",userController.getAllUsers);

userRouter.post("/signup",userController.singup);

userRouter.post("/login",userController.login);

userRouter.get("/userProfile/:id",userController.getUSerProfile);

userRouter.put("/updateProfile/:id",userController.updateUserpeofile);

userRouter.delete("/deleteProfile/:id",userController.deleteUserProfile);

userRouter.patch("/user/profile-image", userController.updateProfileImage);
userRouter.post("/user/profile-image", userController.updateProfileImage);

userRouter.get("/user/starred", repoController.getStarredRepositoriesForUser);
userRouter.get("/user/starred/:userId", repoController.getStarredRepositoriesForUser);

userRouter.post("/user/:userId/follow", authMiddleware, userController.followUser);
userRouter.delete("/user/:userId/follow", authMiddleware, userController.unfollowUser);
userRouter.post("/user/:userId/unfollow", authMiddleware, userController.unfollowUser);
userRouter.get("/user/:userId/followers", userController.getFollowers);
userRouter.get("/user/:userId/following", userController.getFollowing);
userRouter.get("/user/:userId/follow-status", userController.getFollowStatus);
userRouter.get("/user/:userId/public-profile", userController.getPublicUserProfile);
userRouter.get("/users/search", userController.searchUsers);

module.exports = userRouter;
