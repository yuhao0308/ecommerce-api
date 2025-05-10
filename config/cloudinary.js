const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'docslecr1',
  api_key: '675233487839872',
  api_secret: 'CTjLjuCYaoDTxhqXi1amT9xdB0g'
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ecommerce', // This will create a folder in your Cloudinary account
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'], // Allowed image formats
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

// Create multer upload instance
const upload = multer({ storage: storage });

module.exports = { cloudinary, upload }; 