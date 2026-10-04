const fs = require("fs").promises;
const path = require("path");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function getAllFiles(dir, base = "") {
    let results = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            const nested = await getAllFiles(fullPath, relPath);
            results = results.concat(nested);
        } else {
            results.push({ fullPath, relPath });
        }
    }
    return results;
}

async function uploadWithRetry(params, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await s3.upload(params).promise();
        } catch (err) {
            if (attempt === maxRetries) throw err;
            console.log(`Upload attempt ${attempt} encountered network issue (${err.code || err.message}). Retrying in 2s...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
}

async function pushRepo() {
    const repoPath = path.resolve(process.cwd(), ".myGit");
    const commitsPath = path.join(repoPath, "commits");

    try {
        let repositoryId = null;
        let bucketName = S3_BUCKET;
        try {
            const configContent = await fs.readFile(path.join(repoPath, "config.json"), "utf8");
            const config = JSON.parse(configContent);
            repositoryId = config.repositoryId;
            if (config.bucket) bucketName = config.bucket;
        } catch (e) {}

        const commitDirs = await fs.readdir(commitsPath);
        for (const commitDir of commitDirs) {
            const commitPath = path.join(commitsPath, commitDir);
            const stat = await fs.stat(commitPath);
            if (!stat.isDirectory()) continue;

            const files = await getAllFiles(commitPath);
            for (const file of files) {
                const fileContent = await fs.readFile(file.fullPath);
                const normalizedRelPath = file.relPath.replace(/\\/g, "/");

                const s3Key = repositoryId
                    ? `repositories/${repositoryId}/commits/${commitDir}/${normalizedRelPath}`
                    : `commits/${commitDir}/${normalizedRelPath}`;

                const params = {
                    Bucket: bucketName,
                    Key: s3Key,
                    Body: fileContent,
                };
                await uploadWithRetry(params);
            }
        }
        console.log("All commits pushed to S3.");

    } catch (err) {
        console.error("Error pushing to s3", err);
    }
}

module.exports = { pushRepo };