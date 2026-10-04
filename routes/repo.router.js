const express = require("express");
const multer = require("multer");
const repoController = require("../controllers/repoController");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

const repoRouter = express.Router();

repoRouter.post("/repo/create",repoController.createRepository);

repoRouter.get("/repo/all",repoController.getAllRepositories);

repoRouter.get("/repo/:id",repoController.fetchedRepositoryById);

repoRouter.get("/repo/name/:name",repoController.fetchRepositoryByName);

repoRouter.get("/repo/user/:userId",repoController.fetchRepositoryForCurrentUser);
repoRouter.put("/repo/update/:id",repoController.updateRepositoryById)

repoRouter.delete("/repo/delete/:id",repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id",repoController.toggleVisibilityById);

repoRouter.post("/repo/:id/star", repoController.starRepository);
repoRouter.delete("/repo/:id/star", repoController.unstarRepository);
repoRouter.post("/repo/:id/unstar", repoController.unstarRepository);
repoRouter.get("/repo/:id/star-status", repoController.getStarStatus);
repoRouter.get("/repo/starred/user/:userId", repoController.getStarredRepositoriesForUser);
repoRouter.get("/user/starred", repoController.getStarredRepositoriesForUser);
repoRouter.get("/user/starred/:userId", repoController.getStarredRepositoriesForUser);

// Repository files, content, commits, and upload
repoRouter.get("/repo/:id/files", repoController.getRepoFiles);
repoRouter.get("/repo/:id/file", repoController.getRepoFileContent);
repoRouter.get("/repo/:id/file-content", repoController.getRepoFileContent);
repoRouter.get("/repo/:id/commits", repoController.getRepoCommits);
repoRouter.post("/repo/:id/upload", upload.array("files"), repoController.uploadRepoFiles);
repoRouter.post("/repo/:id/files", upload.array("files"), repoController.uploadRepoFiles);

module.exports = repoRouter;