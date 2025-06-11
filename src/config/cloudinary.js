const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'santaratrip',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

// Konfigurasi storage untuk foto profil
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'santaratrip/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

// Konfigurasi storage untuk gambar trip
const tripStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'santaratrip/trips',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }]
  }
});

// Konfigurasi storage untuk foto review
const reviewStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'santaratrip/reviews',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }]
  }
});

// Middleware untuk upload foto profil
const uploadProfile = multer({ storage: profileStorage });

// Middleware untuk upload gambar trip
const uploadTrip = multer({ storage: tripStorage });

// Middleware untuk upload foto review
const uploadReview = multer({ storage: reviewStorage });

module.exports = {
  cloudinary,
  upload,
  uploadProfile,
  uploadTrip,
  uploadReview
};
