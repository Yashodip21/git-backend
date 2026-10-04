
const fs = require("fs").promises;
const path = require("path");

async function copyRecursive(src, dest) {
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            await copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
        }
    } else {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
    }
}

async function revertRepo(commitID) {
    const repoPath = path.resolve(process.cwd(), ".myGit");
    const commitspath = path.join(repoPath, "commits");

    try {
        const commitDir = path.join(commitspath, commitID);
        const files = await fs.readdir(commitDir);
        const parentDir = path.resolve(repoPath, "..");

        for (const file of files) {
            if (file === "commit.json") continue;
            await copyRecursive(path.join(commitDir, file), path.join(parentDir, file));
        }
        console.log(`commit ${commitID} revert succesfully`);
    } catch (err) {
        console.error("Unable to revert:", err);
    }
}

module.exports = { revertRepo };