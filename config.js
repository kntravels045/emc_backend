require('dotenv').config();

// Store environment variables in an object
const config = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  ACCESS_SECRET: process.env.ACCESS_SECRET,
  NODE_ENV: process.env.NODE_ENV
};

module.exports = config;