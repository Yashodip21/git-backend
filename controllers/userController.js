const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient, ReturnDocument } = require("mongodb");
const dotenv = require("dotenv");

var ObjectId = require("mongodb").ObjectId;

dotenv.config();
const uri = process.env.MONGODB_URI ;

let client;

async function connectClient(params) {
    if(!client){
        client = new MongoClient(uri);
        await client.connect();
    }
}

async function getAllUsers(req,res){
     try{
        await connectClient();
        const db = client.db("githubclone");
        const userCollection=db.collection("users");

        const users = await userCollection.find({}).toArray();
        res.json(users);

    }catch(err){
        console.error("Error during fetching ",err.message);
        res.status(500).send("Server error!");

    }
}

async function singup(req,res){
    // res.send("Sigining up!");
    const {username ,password, email}=req.body;
    try{
        await connectClient();
        const db = client.db("githubclone");
        const userCollection=db.collection("users");

        const user = await userCollection.findOne({username});
        if(user){
            return res.status(400).json({message:"User already exists!"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser ={
            username,
            password:hashedPassword,
            email,
            repositories: [],
            followedUsers: [],
            startRepos:[],
        }

        const result = await userCollection.insertOne(newUser);

        const token = jwt.sign({id:result.inserId},process.env.JWT_SECRET_KEY,{expiresIn:"1h"});
        res.json({token,userId:result.inserId});
    }catch(err){
        console.error('Error during the signup',err.message);
        res.status(500).send("Serevr Error");
    }

};

async function login(req,res){
    const {email,password} =req.body;
    try{
        await connectClient();
        const db = client.db("githubclone");
        const userCollection=db.collection("users");

        const user = await userCollection.findOne({email});
        if(!user){
            return res.status(400).json({message:"Invalid crendential!"});
        }

        const isMatch = await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid crendential!"});

        }
        const token =jwt.sign({id:user._id},process.env.JWT_SECRET_KEY,{expiresIn:"1h"});
        res.json({token,userId:user._id});
    }catch(err){
        console.error("Error during login",err.message);
        res.status(500).send("Server error!");

    }
     
};

async function getUSerProfile(req,res){
   const currentID = req.params.id;

   try{
        await connectClient();
        const db = client.db("githubclone");
        const userCollection = db.collection("users");

        const user =  await userCollection.findOne({
         _id: new ObjectId(currentID)
    });

    if(!user){
            return res.status(400).json({message:"User not found!"});
        }
        res.send(user);

   }catch(err){
        console.error("Error during profile fetching",err.message);
        res.status(500).send("Server error!");

    }
};
//UPDATE FUNCTIONALITY
async function updateUserpeofile (req,res){
    const currentID = req.params.id;
    const {email ,password}=req.body;

    try{
        await connectClient();
        const db = client.db("githubclone");
        const userCollection = db.collection("users");
        let updateFields = {email};
        if(password){
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password,salt);
            updateFields.password = hashedPassword;
        }

        const result = await userCollection.findOneAndUpdate({
            _id: new ObjectId(currentID),

        },
          {$set:updateFields},
          {returnDocument:"after"}
        );
        if(!result){
            return res.status(400).json({message:"User not found!"});

        }
        res.send(result.value);

    }catch(err){
        console.error("Error during updating",err.message);
        res.status(500).send("Server error!");

    }

};
async function  deleteUserProfile(req,res){
        const currentID = req.params.id;

        try{
        await connectClient();
        const db = client.db("githubclone");
        const userCollection = db.collection("users");

        const result = await userCollection.deleteOne({
            _id:new ObjectId(currentID),
        });
        if(result.deleteCount==0){
            return res.status(404).json({message:"User not found"})
        }
        res.json({message:"User Profile Deleted!"})

        }catch(err){
        console.error("Error during updating",err.message);
        res.status(500).send("Server error!");

    }

   
};

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Please select a valid image (JPG, JPEG, PNG, WEBP)."));
  },
}).single("profileImage");

async function updateProfileImage(req, res) {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image must be smaller than 5 MB." });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message || "Please select a valid image." });
    }

    const { userId } = req.body;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid or missing User ID." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const imageUrl = `http://localhost:3002/uploads/${req.file.filename}`;

    try {
      await connectClient();
      const db = client.db("githubclone");
      const userCollection = db.collection("users");

      const result = await userCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: { profileImage: imageUrl } },
        { returnDocument: "after" }
      );

      if (!result) {
        return res.status(404).json({ message: "User not found!" });
      }

      res.json({
        message: "Profile image updated successfully",
        profileImage: imageUrl,
        user: result.value || result,
      });
    } catch (error) {
      console.error("Error updating profile image: ", error.message);
      res.status(500).json({ message: "Server error updating profile image." });
    }
  });
}

// ==========================================
// FOLLOW FEATURE FUNCTIONS
// ==========================================

async function followUser(req, res) {
    const currentUserId = req.userId; // set by authMiddleware
    const targetUserId = req.params.userId;

    try {
        if (!currentUserId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (currentUserId.toString() === targetUserId.toString()) {
            return res.status(400).json({ error: 'You cannot follow yourself' });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        const targetUser = await userCollection.findOne({ _id: new ObjectId(targetUserId) });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add targetUserId to current user's followedUsers (= following list)
        await userCollection.updateOne(
            { _id: new ObjectId(currentUserId) },
            { $addToSet: { followedUsers: new ObjectId(targetUserId) } }
        );

        // Add currentUserId to target user's followers
        await userCollection.updateOne(
            { _id: new ObjectId(targetUserId) },
            { $addToSet: { followers: new ObjectId(currentUserId) } }
        );

        const updatedCurrentUser = await userCollection.findOne({ _id: new ObjectId(currentUserId) });
        const updatedTargetUser = await userCollection.findOne({ _id: new ObjectId(targetUserId) });

        res.json({
            message: 'User followed successfully',
            following: true,
            followingCount: Array.isArray(updatedCurrentUser.followedUsers) ? updatedCurrentUser.followedUsers.length : 0,
            followersCount: Array.isArray(updatedTargetUser.followers) ? updatedTargetUser.followers.length : 0,
        });
    } catch (err) {
        console.error('Error following user:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

async function unfollowUser(req, res) {
    const currentUserId = req.userId;
    const targetUserId = req.params.userId;

    try {
        if (!currentUserId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        // Remove targetUserId from current user's followedUsers
        await userCollection.updateOne(
            { _id: new ObjectId(currentUserId) },
            { $pull: { followedUsers: new ObjectId(targetUserId) } }
        );

        // Remove currentUserId from target user's followers
        await userCollection.updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { followers: new ObjectId(currentUserId) } }
        );

        const updatedCurrentUser = await userCollection.findOne({ _id: new ObjectId(currentUserId) });
        const updatedTargetUser = await userCollection.findOne({ _id: new ObjectId(targetUserId) });

        res.json({
            message: 'User unfollowed successfully',
            following: false,
            followingCount: Array.isArray(updatedCurrentUser.followedUsers) ? updatedCurrentUser.followedUsers.length : 0,
            followersCount: Array.isArray(updatedTargetUser.followers) ? updatedTargetUser.followers.length : 0,
        });
    } catch (err) {
        console.error('Error unfollowing user:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getFollowers(req, res) {
    const targetUserId = req.params.userId;
    const currentUserId = req.query.viewerId || req.headers['x-user-id'] || '';

    try {
        if (!ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        const user = await userCollection.findOne({ _id: new ObjectId(targetUserId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followerIds = Array.isArray(user.followers) ? user.followers : [];
        const followers = followerIds.length > 0
            ? await userCollection.find({ _id: { $in: followerIds.map(id => new ObjectId(id)) } }, { projection: { password: 0 } }).toArray()
            : [];

        // For each follower, check if currentUser is following them
        const followersWithStatus = followers.map(f => {
            const currentUserFollowing = currentUserId && ObjectId.isValid(currentUserId)
                ? Array.isArray(f.followedUsers) && f.followedUsers.some(id => id.toString() === currentUserId.toString())
                : false;
            // Actually we need to check if currentUser follows this follower
            // We'll handle that on frontend using the currentUser's followedUsers list
            return {
                _id: f._id,
                username: f.username || f.userName,
                email: f.email,
                profileImage: f.profileImage || '',
                followersCount: Array.isArray(f.followers) ? f.followers.length : 0,
                followingCount: Array.isArray(f.followedUsers) ? f.followedUsers.length : 0,
            };
        });

        res.json({
            followers: followersWithStatus,
            count: followersWithStatus.length,
        });
    } catch (err) {
        console.error('Error fetching followers:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getFollowing(req, res) {
    const targetUserId = req.params.userId;

    try {
        if (!ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        const user = await userCollection.findOne({ _id: new ObjectId(targetUserId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followingIds = Array.isArray(user.followedUsers) ? user.followedUsers : [];
        const following = followingIds.length > 0
            ? await userCollection.find({ _id: { $in: followingIds.map(id => new ObjectId(id)) } }, { projection: { password: 0 } }).toArray()
            : [];

        const followingData = following.map(f => ({
            _id: f._id,
            username: f.username || f.userName,
            email: f.email,
            profileImage: f.profileImage || '',
            followersCount: Array.isArray(f.followers) ? f.followers.length : 0,
            followingCount: Array.isArray(f.followedUsers) ? f.followedUsers.length : 0,
        }));

        res.json({
            following: followingData,
            count: followingData.length,
        });
    } catch (err) {
        console.error('Error fetching following:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getFollowStatus(req, res) {
    const currentUserId = req.query.viewerId || req.headers['x-user-id'] || '';
    const targetUserId = req.params.userId;

    try {
        if (!ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        const targetUser = await userCollection.findOne({ _id: new ObjectId(targetUserId) });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        let isFollowing = false;
        if (currentUserId && ObjectId.isValid(currentUserId)) {
            const currentUser = await userCollection.findOne({ _id: new ObjectId(currentUserId) });
            if (currentUser && Array.isArray(currentUser.followedUsers)) {
                isFollowing = currentUser.followedUsers.some(id => id.toString() === targetUserId.toString());
            }
        }

        res.json({
            following: isFollowing,
            followersCount: Array.isArray(targetUser.followers) ? targetUser.followers.length : 0,
            followingCount: Array.isArray(targetUser.followedUsers) ? targetUser.followedUsers.length : 0,
            username: targetUser.username || targetUser.userName,
            email: targetUser.email,
            profileImage: targetUser.profileImage || '',
        });
    } catch (err) {
        console.error('Error fetching follow status:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

async function searchUsers(req, res) {
    const query = req.query.q || '';
    const currentUserId = req.query.viewerId || req.headers['x-user-id'] || '';

    try {
        if (!query.trim()) {
            return res.json({ users: [] });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        const users = await userCollection.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { userName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        }, { projection: { password: 0 } }).limit(20).toArray();

        // Check follow status for each user
        let currentUserDoc = null;
        if (currentUserId && ObjectId.isValid(currentUserId)) {
            currentUserDoc = await userCollection.findOne({ _id: new ObjectId(currentUserId) });
        }

        const usersWithStatus = users
            .filter(u => u._id.toString() !== currentUserId.toString())
            .map(u => ({
                _id: u._id,
                username: u.username || u.userName,
                email: u.email,
                profileImage: u.profileImage || '',
                followersCount: Array.isArray(u.followers) ? u.followers.length : 0,
                following: currentUserDoc && Array.isArray(currentUserDoc.followedUsers)
                    ? currentUserDoc.followedUsers.some(id => id.toString() === u._id.toString())
                    : false,
            }));

        res.json({ users: usersWithStatus });
    } catch (err) {
        console.error('Error searching users:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getPublicUserProfile(req, res) {
    const targetUserId = req.params.userId;
    const currentUserId = req.query.viewerId || req.headers['x-user-id'] || '';

    try {
        if (!ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        await connectClient();
        const db = client.db('githubclone');
        const userCollection = db.collection('users');

        const targetUser = await userCollection.findOne(
            { _id: new ObjectId(targetUserId) },
            { projection: { password: 0 } }
        );
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        let isFollowing = false;
        if (currentUserId && ObjectId.isValid(currentUserId) && currentUserId !== targetUserId) {
            const currentUser = await userCollection.findOne({ _id: new ObjectId(currentUserId) });
            if (currentUser && Array.isArray(currentUser.followedUsers)) {
                isFollowing = currentUser.followedUsers.some(id => id.toString() === targetUserId.toString());
            }
        }

        res.json({
            _id: targetUser._id,
            username: targetUser.username || targetUser.userName,
            email: targetUser.email,
            profileImage: targetUser.profileImage || '',
            followersCount: Array.isArray(targetUser.followers) ? targetUser.followers.length : 0,
            followingCount: Array.isArray(targetUser.followedUsers) ? targetUser.followedUsers.length : 0,
            isFollowing,
        });
    } catch (err) {
        console.error('Error fetching public profile:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports={
    getAllUsers,
    singup,
    login,
    getUSerProfile,
    updateUserpeofile,
    deleteUserProfile,
    updateProfileImage,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowStatus,
    searchUsers,
    getPublicUserProfile,
}

