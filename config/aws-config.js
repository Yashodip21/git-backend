const AWS = require("aws-sdk");

const S3_REGION = process.env.AWS_REGION || "eu-north-1";

AWS.config.update({
    region: S3_REGION,
    maxRetries: 3,
});

const s3 = new AWS.S3({
    region: S3_REGION,
    signatureVersion: "v4",
});

const S3_BUCKET = process.env.S3_BUCKET || "sampleyashbucket";

module.exports = { s3, S3_BUCKET };
