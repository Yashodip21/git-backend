const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require("uuid");

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

async function commitRepo(argv) {
    const message = argv && argv.message ? argv.message : (typeof argv === "string" ? argv : "Commit changes");
    const repoPath = path.resolve(process.cwd(), ".myGit");
    const stagePath = path.join(repoPath, "staging");
    const commitPath = path.join(repoPath, "commits");

    try {
        const commitID = uuidv4();
        const commitDir = path.join(commitPath, commitID);
        await fs.mkdir(commitDir, { recursive: true });
        
        const files = await fs.readdir(stagePath);
        for (const file of files) {
            await copyRecursive(
                path.join(stagePath, file),
                path.join(commitDir, file)
            );
        }
        
        await fs.writeFile(
            path.join(commitDir, "commit.json"),
            JSON.stringify({
                message,
                date: new Date().toISOString()
            }, null, 2)
        );
        console.log(`Commit ${commitID} created with message:${message}`);

    } catch (err) {
        console.error("Error committing files", err);
    }
}

module.exports = { commitRepo };