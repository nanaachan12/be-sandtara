'use strict';

const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');
const { uploadProfile } = require('../config/cloudinary');

const routes = [
  {
    method: 'POST',
    path: '/users/upload-photo',
    options: {
      pre: [{ method: auth }],
      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        allow: 'multipart/form-data'
      },
      handler: async (request, h) => {
        // Multer tidak berfungsi langsung dengan Hapi
        // Kita perlu menangani upload file secara manual
        const file = request.payload.file;
        
        if (!file) {
          return h.response({
            success: false,
            error: 'Tidak ada file yang diupload'
          }).code(400);
        }
        
        // Validasi tipe file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.hapi.headers['content-type'])) {
          return h.response({
            success: false,
            error: 'Format file tidak didukung. Gunakan jpg, jpeg, atau png'
          }).code(400);
        }
        
        try {
          // Upload ke Cloudinary
          const result = await new Promise((resolve, reject) => {
            const cloudinary = require('cloudinary').v2;
            
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'santaratrip/profiles',
                transformation: [{ width: 500, height: 500, crop: 'limit' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            file.pipe(stream);
          });
          
          // Update user dengan URL foto baru
          const User = require('../models/User');
          const user = await User.findByIdAndUpdate(
            request.auth.credentials.id,
            { photo: result.secure_url },
            { new: true }
          );
          
          return {
            success: true,
            data: {
              id: user._id,
              name: user.name,
              email: user.email,
              photo: user.photo,
              preferences: user.preferences,
              createdAt: user.createdAt
            }
          };
        } catch (error) {
          console.error(error);
          return h.response({
            success: false,
            error: 'Gagal mengupload foto'
          }).code(500);
        }
      }
    }
  },
  {
    method: 'DELETE',
    path: '/users/delete-photo',
    options: {
      pre: [{ method: auth }]
    },
    handler: uploadController.deleteProfilePhoto
  }
];

module.exports = {
  plugin: {
    name: 'upload-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
