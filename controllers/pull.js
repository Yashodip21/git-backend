const fs = require("fs").promises;
const path = require("path");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function pullRepo() {
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

        const prefix = repositoryId
            ? `repositories/${repositoryId}/commits/`
            : "commits/";

        const data = await s3
            .listObjectsV2({
                Bucket: bucketName,
                Prefix: prefix,
            })
            .promise();

        const objects = data.Contents || [];

        for (const object of objects) {
            const key = object.Key;
            const relKey = key.substring(prefix.length);
            const slashIdx = relKey.indexOf("/");
            if (slashIdx === -1) continue;

            const filePath = path.join(commitsPath, relKey);
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            const params = {
                Bucket: bucketName,
                Key: key,
            };

            const fileContent = await s3.getObject(params).promise();
            await fs.writeFile(filePath, fileContent.Body);
        }

        console.log("All commits are pulled from S3");

    } catch (err) {
        console.error("Unable to pull:", err);
    }
}

module.exports = { pullRepo };