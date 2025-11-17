const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const config = require('./config');


const s3Client = new S3Client({
  region: config.AWS_REGION, 
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey:config.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to upload files to S3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket:config.S3_BUCKET_NAME, // Ensure your bucket name is correct
    acl: 'public-read',
    key: (req, file, cb) => {
      // Generate a unique filename for the uploaded file
      cb(null, `Dashboard/${Date.now()}_${file.originalname}`);
    },
  }),
});



module.exports = upload;