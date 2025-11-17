const { S3Client} = require("@aws-sdk/client-s3");
const config = require("./config"); // your config file

const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY
  },
});
//PutObjectCommand,DeleteObjectCommand 

module.exports = s3;
