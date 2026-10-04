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

async function addRepo(filePath) {
    const repoPath = path.resolve(process.cwd(), ".myGit");
    const stagingPath = path.join(repoPath, "staging");

    try {
        await fs.mkdir(stagingPath, { recursive: true });
        const resolvedPath = path.resolve(process.cwd(), filePath);
        const relPath = path.relative(process.cwd(), resolvedPath);
        const destPath = path.join(stagingPath, relPath);

        await copyRecursive(resolvedPath, destPath);
        console.log(`file ${filePath} added to the staging area!`);
    } catch (err) {
        console.error("Error While adding file", err);
    }
}

module.exports = { addRepo };