const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES.split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);

  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter,
});

const uploadToS3 = async (file, folder = 'assignments') => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${folder}/${uuidv4()}${fileExtension}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private',
  };

  try {
    const result = await s3.upload(uploadParams).promise();
    return {
      url: result.Location,
      key: result.Key,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('File upload failed');
  }
};

const deleteFromS3 = async (key) => {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(deleteParams).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
};

const generateSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    });
    return url;
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error('Failed to generate download URL');
  }
};

module.exports = {
  upload,
  uploadToS3,
  deleteFromS3,
  generateSignedUrl,
};