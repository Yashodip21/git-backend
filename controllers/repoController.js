const mongoose = require ("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");
const { s3, S3_BUCKET } = require("../config/aws-config");
const { v4: uuidv4 } = require("uuid");


async function createRepository(req,res){
    const {owner, name, issues, content, description,visibility}=req.body;

    try{
        if(!name){
            return res.status(400).json({error:"Repository name is requires!"});
        }
        if(!mongoose.Types.ObjectId.isValid(owner)){
            return res.status(400).json({error:"Invalid User ID!"});
        }
        const newRepository = new Repository({
            name,
            description,
            visibility,
            owner,
            content,
            issues
        });
        const result = await newRepository.save();
        res.status(201).json({
            message:"Repository created!",
            repositoryID:result._id,
        });


    }catch(err){
        console.error("Error during repository creation!",err.message);
        res.status(500).send("Server error!");

    }
};

async function getAllRepositories  (req,res){
    try{
        const repositories = await Repository.find({})
        .populate("owner")
        .populate("issues");
        res.json(repositories); 

    }catch(err){
        console.error("Error during  fetching repository!",err.message);
        res.status(500).send("Server error!");

    }
};

async function fetchedRepositoryById(req,res){
    const {id} = req.params;
    try{
        const repository = await Repository.findById(id)
        .populate("owner")
        .populate("issues");
        console.log("ID from params:", id);
        
     res.json(repository); 



    }catch(err){
        console.error("Error during  fetching repository!",err.message);
        res.status(500).send("Server error!");

    }

};

async function fetchRepositoryByName  (req,res){
      const {name} = req.params;
    try{
        const repository = await Repository.find({name})
        .populate("owner")
        .populate("issues");

    res.json(repository); 



    }catch(err){
        console.error("Error during  fetching repository!",err.message);
        res.status(500).send("Server error!");

    }
};

async function fetchRepositoryForCurrentUser  (req,res){
    // console.log("Request params:", req.params);

   const userId = req.params.userId;

   try{
    const repositories = await Repository.find({owner:userId});
    // if(!repositories || repositories.length==0){
    //     return res.status(404).json({error:"User Repository not found"})
    // }

    res.json({message:"Repositories found",repositories});

   }catch(err){
        console.error("Error during  fetching user repository!",err.message);
        res.status(500).send("Server error!");

    }
}

async function updateRepositoryById  (req,res){
    const {id} =req.params;
    const  {content,description} = req.body;

    try{
        const repository = await Repository.findById(id);
         if(!repository ){
        return res.status(404).json({error:"User Repository not found"})
    }
    repository.content.push(content);
    repository.description = description;

    const updatedRepository = await repository.save();

    res.json({
       message:"Repository updated successfully!",
       repository:updatedRepository,
    });


    }catch(err){
        console.error("Error during  updating repository!",err.message);
        res.status(500).send("Server error!");

    }
};
async function toggleVisibilityById  (req,res){
    const {id} =req.params;
   

    try{
        const repository = await Repository.findById(id);
         if(!repository ){
        return res.status(404).json({error:"User Repository not found"})
    }
    repository.visibility =!repository.visibility;

    const updatedRepository = await repository.save();

    res.json({
       message:"Repository visibility toggled  successfully!",
       repository:updatedRepository,
    });


    }catch(err){
        console.error("Error during toggeling repository!",err.message);
        res.status(500).send("Server error!");

    }
};

async function deleteRepositoryById  (req,res){
    const {id} = req.params;

    try{
        const repository = await Repository.findOneAndDelete(id);

        if(!repository ){
        return res.status(404).json({error:" Repository not found"})
    }
    res.json({message:"Repository deleted successfully!"});
    }catch(err){
        console.error("Error during deleting repository!",err.message);
        res.status(500).send("Server error!");

    }
};

async function starRepository(req, res) {
    const { id } = req.params;
    const userId = req.body.userId || req.headers["x-user-id"];

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ error: "Authentication required / Invalid User ID" });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const repoObjectId = new mongoose.Types.ObjectId(id);

        const repository = await Repository.findByIdAndUpdate(
            repoObjectId,
            { $addToSet: { stars: userObjectId } },
            { new: true }
        );

        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        // Update user document on both starRepos and starredRepositories fields
        await User.findByIdAndUpdate(
            userObjectId,
            { $addToSet: { starRepos: repoObjectId, starredRepositories: repoObjectId } }
        );

        const starList = Array.isArray(repository.stars) ? repository.stars : [];

        res.json({
            message: "Repository starred",
            starred: true,
            starCount: starList.length,
        });
    } catch (err) {
        console.error("Error starring repository: ", err.message);
        res.status(500).json({ error: "Server error starring repository" });
    }
}

async function unstarRepository(req, res) {
    const { id } = req.params;
    const userId = req.body.userId || req.query.userId || req.headers["x-user-id"];

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ error: "Authentication required / Invalid User ID" });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const repoObjectId = new mongoose.Types.ObjectId(id);

        const repository = await Repository.findByIdAndUpdate(
            repoObjectId,
            { $pull: { stars: { $in: [userObjectId, userId] } } },
            { new: true }
        );

        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        await User.findByIdAndUpdate(
            userObjectId,
            { $pull: { starRepos: repoObjectId, starredRepositories: repoObjectId } }
        );

        const starList = Array.isArray(repository.stars) ? repository.stars : [];

        res.json({
            message: "Repository unstarred",
            starred: false,
            starCount: starList.length,
        });
    } catch (err) {
        console.error("Error unstarring repository: ", err.message);
        res.status(500).json({ error: "Server error unstarring repository" });
    }
}

async function getStarStatus(req, res) {
    const { id } = req.params;
    const userId = req.query.userId || req.headers["x-user-id"];

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }

        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        const starList = Array.isArray(repository.stars) ? repository.stars : [];
        const isStarred = userId
            ? starList.some((starId) => starId.toString() === userId.toString())
            : false;

        res.json({
            starred: isStarred,
            starCount: starList.length,
        });
    } catch (err) {
        console.error("Error fetching star status: ", err.message);
        res.status(500).json({ error: "Server error fetching star status" });
    }
}

async function getStarredRepositoriesForUser(req, res) {
    const userId = req.params.userId || req.query.userId || req.headers["x-user-id"];

    try {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(200).json({
                message: "No starred repositories found",
                repositories: [],
            });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const user = await User.findById(userObjectId);
        const starReposInUser = user
            ? [
                ...(Array.isArray(user.starRepos) ? user.starRepos : []),
                ...(Array.isArray(user.starredRepositories) ? user.starredRepositories : [])
              ]
            : [];

        const repositories = await Repository.find({
            $or: [
                { stars: userObjectId },
                { stars: userId },
                { _id: { $in: starReposInUser } }
            ],
        }).populate("owner");

        res.json({
            message: "Starred repositories found",
            repositories: repositories || [],
        });
    } catch (err) {
        console.error("Error fetching starred repositories: ", err.message);
        res.status(500).json({
            error: "Server error fetching starred repositories",
            repositories: [],
        });
    }
}

async function getRepoFiles(req, res) {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }
        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        const prefix = `repositories/${id}/commits/`;
        let isTruncated = true;
        let continuationToken = null;
        let allObjects = [];

        while (isTruncated) {
            const params = {
                Bucket: S3_BUCKET,
                Prefix: prefix,
            };
            if (continuationToken) params.ContinuationToken = continuationToken;
            const data = await s3.listObjectsV2(params).promise();
            if (data.Contents) allObjects = allObjects.concat(data.Contents);
            isTruncated = data.IsTruncated;
            continuationToken = data.NextContinuationToken;
        }

        const commitMap = {};
        for (const obj of allObjects) {
            const relKey = obj.Key.substring(prefix.length);
            const slashIdx = relKey.indexOf("/");
            if (slashIdx === -1) continue;
            const commitId = relKey.substring(0, slashIdx);
            if (!commitMap[commitId]) {
                commitMap[commitId] = {
                    commitId,
                    message: "Commit " + commitId.slice(0, 7),
                    date: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date().toISOString(),
                };
            }
        }

        await Promise.all(
            Object.keys(commitMap).map(async (cid) => {
                try {
                    const cData = await s3.getObject({
                        Bucket: S3_BUCKET,
                        Key: `${prefix}${cid}/commit.json`,
                    }).promise();
                    const meta = JSON.parse(cData.Body.toString("utf8"));
                    if (meta.message) commitMap[cid].message = meta.message;
                    if (meta.date) commitMap[cid].date = meta.date;
                } catch (e) {}
            })
        );

        // Sort chronologically (oldest to newest) to replay files
        const sortedCommits = Object.values(commitMap).sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        const fileMap = {};
        for (const commit of sortedCommits) {
            const commitPrefix = `${prefix}${commit.commitId}/`;
            const commitFiles = allObjects.filter(
                (obj) => obj.Key.startsWith(commitPrefix) && !obj.Key.endsWith("/commit.json") && obj.Key !== `${commitPrefix}commit.json`
            );
            for (const obj of commitFiles) {
                const filePath = obj.Key.substring(commitPrefix.length);
                if (!filePath || filePath === "commit.json") continue;
                fileMap[filePath] = {
                    path: filePath,
                    name: filePath.split("/").pop(),
                    size: obj.Size,
                    lastModified: obj.LastModified,
                    commitId: commit.commitId,
                    commitMessage: commit.message,
                };
            }
        }

        let files = Object.values(fileMap);
        files.sort((a, b) => a.path.localeCompare(b.path));

        // Fallback to repo.content if S3 has no files yet
        if (files.length === 0 && Array.isArray(repository.content) && repository.content.length > 0) {
            files = repository.content.map((p) => ({
                path: p,
                name: p.split("/").pop(),
                size: 0,
                commitMessage: "Initial file",
            }));
        }

        // Sync file paths in repository.content
        const currentPaths = files.map((f) => f.path);
        if (currentPaths.length > 0) {
            repository.content = currentPaths;
            await repository.save().catch(() => {});
        }

        res.json({
            repositoryId: id,
            name: repository.name,
            files,
            totalCommits: sortedCommits.length,
            latestCommit: sortedCommits.length > 0 ? sortedCommits[sortedCommits.length - 1] : null,
        });

    } catch (err) {
        console.error("Error fetching repository files:", err.message);
        res.status(500).json({ error: "Server error fetching repository files" });
    }
}

async function getRepoFileContent(req, res) {
    const { id } = req.params;
    const filePath = req.query.path;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }
        if (!filePath) {
            return res.status(400).json({ error: "File path query parameter 'path' is required" });
        }

        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        const prefix = `repositories/${id}/commits/`;
        const data = await s3.listObjectsV2({
            Bucket: S3_BUCKET,
            Prefix: prefix,
        }).promise();

        const normalizedTarget = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
        const matchingObjects = (data.Contents || []).filter((obj) => {
            const relKey = obj.Key.substring(prefix.length);
            const slashIdx = relKey.indexOf("/");
            if (slashIdx === -1) return false;
            const fileRel = relKey.substring(slashIdx + 1);
            return fileRel === normalizedTarget;
        });

        if (matchingObjects.length === 0) {
            return res.status(404).json({ error: "File not found in repository" });
        }

        matchingObjects.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
        const targetObj = matchingObjects[0];

        const fileData = await s3.getObject({
            Bucket: S3_BUCKET,
            Key: targetObj.Key,
        }).promise();

        res.json({
            path: normalizedTarget,
            content: fileData.Body.toString("utf8"),
            size: targetObj.Size,
            lastModified: targetObj.LastModified,
        });

    } catch (err) {
        console.error("Error fetching file content:", err.message);
        res.status(500).json({ error: "Server error fetching file content" });
    }
}

async function getRepoCommits(req, res) {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }
        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        const prefix = `repositories/${id}/commits/`;
        const data = await s3.listObjectsV2({
            Bucket: S3_BUCKET,
            Prefix: prefix,
        }).promise();

        const objects = data.Contents || [];
        const commitMap = {};

        for (const obj of objects) {
            const relKey = obj.Key.substring(prefix.length);
            const slashIdx = relKey.indexOf("/");
            if (slashIdx === -1) continue;
            const commitId = relKey.substring(0, slashIdx);
            if (!commitMap[commitId]) {
                commitMap[commitId] = {
                    commitId,
                    message: "Commit " + commitId.slice(0, 7),
                    date: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date().toISOString(),
                    fileCount: 0,
                };
            }
            if (!obj.Key.endsWith("/commit.json") && obj.Key !== `${prefix}${commitId}/commit.json`) {
                commitMap[commitId].fileCount++;
            }
        }

        await Promise.all(
            Object.keys(commitMap).map(async (cid) => {
                try {
                    const cData = await s3.getObject({
                        Bucket: S3_BUCKET,
                        Key: `${prefix}${cid}/commit.json`,
                    }).promise();
                    const meta = JSON.parse(cData.Body.toString("utf8"));
                    if (meta.message) commitMap[cid].message = meta.message;
                    if (meta.date) commitMap[cid].date = meta.date;
                } catch (e) {}
            })
        );

        // Sort newest first
        const commitsList = Object.values(commitMap).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        res.json({
            repositoryId: id,
            name: repository.name,
            commits: commitsList,
        });

    } catch (err) {
        console.error("Error fetching repository commits:", err.message);
        res.status(500).json({ error: "Server error fetching commits" });
    }
}

async function uploadRepoFiles(req, res) {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid repository ID" });
        }
        const repository = await Repository.findById(id);
        if (!repository) {
            return res.status(404).json({ error: "Repository not found" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const commitId = uuidv4();
        const commitDate = new Date().toISOString();
        const customMessage = req.body.message && req.body.message.trim();
        const commitMessage = customMessage
            ? customMessage
            : req.files.length === 1
            ? `Add ${req.files[0].originalname}`
            : `Add ${req.files.length} files`;

        let paths = req.body.paths;
        if (!paths) {
            paths = req.files.map((f) => f.originalname);
        } else if (!Array.isArray(paths)) {
            paths = [paths];
        }

        // Upload commit.json
        await s3.upload({
            Bucket: S3_BUCKET,
            Key: `repositories/${id}/commits/${commitId}/commit.json`,
            Body: JSON.stringify({ message: commitMessage, date: commitDate }, null, 2),
            ContentType: "application/json",
        }).promise();

        const uploadedPaths = [];
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            let relPath = (paths[i] || file.originalname).replace(/\\/g, "/").replace(/^\/+/, "");
            if (!relPath) relPath = file.originalname;

            await s3.upload({
                Bucket: S3_BUCKET,
                Key: `repositories/${id}/commits/${commitId}/${relPath}`,
                Body: file.buffer,
            }).promise();

            uploadedPaths.push(relPath);
        }

        // Update repository.content in MongoDB
        for (const p of uploadedPaths) {
            if (!repository.content.includes(p)) {
                repository.content.push(p);
            }
        }
        await repository.save();

        res.status(201).json({
            message: "Files uploaded and committed successfully",
            commitId,
            commitMessage,
            files: uploadedPaths,
        });

    } catch (err) {
        console.error("Error uploading files to repository:", err);
        res.status(500).json({ error: "Server error uploading files" });
    }
}

module.exports={
    createRepository,
    getAllRepositories,
    fetchedRepositoryById,
    fetchRepositoryByName,
    fetchRepositoryForCurrentUser,
    updateRepositoryById,
    toggleVisibilityById,
    deleteRepositoryById,
    starRepository,
    unstarRepository,
    getStarStatus,
    getStarredRepositoriesForUser,
    getRepoFiles,
    getRepoFileContent,
    getRepoCommits,
    uploadRepoFiles,
};


