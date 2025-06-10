const Boom = require('@hapi/boom');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

// @desc    Upload foto profil
// @route   POST /users/upload-photo
// @access  Private
exports.uploadProfilePhoto = async (request, h) => {
  try {
    // File diupload melalui multer dan disimpan di Cloudinary
    // URL gambar tersedia di request.file.path
    if (!request.file) {
      return Boom.badRequest('Tidak ada file yang diupload');
    }

    const imageUrl = request.file.path;
    
    // Update user dengan URL foto baru
    const user = await User.findByIdAndUpdate(
      request.auth.credentials.id,
      { photo: imageUrl },
      { new: true }
    );
    
    if (!user) {
      return Boom.notFound('User tidak ditemukan');
    }

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
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Hapus foto profil
// @route   DELETE /users/delete-photo
// @access  Private
exports.deleteProfilePhoto = async (request, h) => {
  try {
    const user = await User.findById(request.auth.credentials.id);
    
    if (!user) {
      return Boom.notFound('User tidak ditemukan');
    }
    
    // Jika user memiliki foto selain default
    if (user.photo !== 'default.jpg' && user.photo.includes('cloudinary')) {
      // Ekstrak public_id dari URL Cloudinary
      const publicId = user.photo.split('/').pop().split('.')[0];
      
      // Hapus gambar dari Cloudinary
      await cloudinary.uploader.destroy(`santaratrip/profiles/${publicId}`);
    }
    
    // Reset foto ke default
    user.photo = 'default.jpg';
    await user.save();
    
    return {
      success: true,
      message: 'Foto profil berhasil dihapus',
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
    return Boom.badImplementation('Server Error');
  }
};
