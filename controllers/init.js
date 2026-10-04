const fs = require("fs").promises;
const path = require("path");
const { S3_BUCKET } = require("../config/aws-config");

async function initRepo(argv) {
    // repositoryId comes from the CLI arg: node index.js init <repositoryId>
    const repositoryId = argv && (argv.repositoryId || (argv._ && argv._[1]))
        ? (argv.repositoryId || argv._[1])
        : null;

    const repoPath = path.resolve(process.cwd(), ".myGit");
    const stagingPath = path.join(repoPath, "staging");
    const commitsPath = path.join(repoPath, "commits");

    try {
        await fs.mkdir(repoPath, { recursive: true });

        // Clean staging and commits so new repository initialization starts fresh
        await fs.rm(stagingPath, { recursive: true, force: true }).catch(() => {});
        await fs.rm(commitsPath, { recursive: true, force: true }).catch(() => {});

        await fs.mkdir(stagingPath, { recursive: true });
        await fs.mkdir(commitsPath, { recursive: true });

        await fs.writeFile(
            path.join(repoPath, "config.json"),
            JSON.stringify(
                {
                    bucket: process.env.S3_BUCKET || S3_BUCKET,
                    repositoryId: repositoryId || null,
                },
                null,
                2
            )
        );

        if (repositoryId) {
            console.log(`Repository initialised and linked to DevForge repository: ${repositoryId}`);
        } else {
            console.log("Repository initialised (no DevForge repository ID provided — push/pull will not be scoped)");
        }

    } catch (err) {
        console.error("Error initializing repository", err);
    }
}

module.exports = { initRepo };