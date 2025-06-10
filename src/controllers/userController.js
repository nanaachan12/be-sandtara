const User = require('../models/User');
const Boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get user profile
// @route   GET /users/profile
// @access  Private
exports.getProfile = async (request, h) => {
  try {
    const user = await User.findById(request.auth.credentials.id);
    
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

// @desc    Update user profile
// @route   PUT /users/profile
// @access  Private
exports.updateProfile = async (request, h) => {
  try {
    const { name, photo, preferences } = request.payload;
    
    // Buat objek updateData dengan field yang akan diupdate
    const updateData = {};
    if (name) updateData.name = name;
    if (photo) updateData.photo = photo;
    if (preferences) updateData.preferences = preferences;
    
    // Temukan user dan update
    const user = await User.findByIdAndUpdate(
      request.auth.credentials.id,
      updateData,
      { new: true, runValidators: true }
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

// @desc    Delete user
// @route   DELETE /users/delete
// @access  Private
exports.deleteUser = async (request, h) => {
  try {
    const user = await User.findById(request.auth.credentials.id);
    
    if (!user) {
      return Boom.notFound('User tidak ditemukan');
    }
    
    await user.deleteOne();
    
    return {
      success: true,
      message: 'Akun berhasil dihapus'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (request, h) => {
  try {
    console.log('getAllUsers - Auth credentials:', request.auth.credentials);
    
    // Check if user is admin
    if (request.auth.credentials.role !== 'admin') {
      console.log('getAllUsers - Access denied: User is not admin');
      return Boom.forbidden('Akses ditolak. Hanya admin yang diizinkan.');
    }

    const users = await User.find().select('-password');
    console.log(`getAllUsers - Successfully fetched ${users.length} users`);
    
    return h.response({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return Boom.badImplementation('Error saat mengambil data users');
  }
};

// @desc    Get single user
// @route   GET /api/users/{id}
// @access  Private/Admin
exports.getUser = async (request, h) => {
  try {
    console.log('getUser - Auth credentials:', request.auth.credentials);
    console.log('getUser - Requested user ID:', request.params.id);

    // Check if user is admin
    if (request.auth.credentials.role !== 'admin') {
      console.log('getUser - Access denied: User is not admin');
      return Boom.forbidden('Akses ditolak. Hanya admin yang diizinkan.');
    }

    const user = await User.findById(request.params.id).select('-password');
    
    if (!user) {
      console.log('getUser - User not found');
      return Boom.notFound('User tidak ditemukan');
    }

    console.log('getUser - Successfully fetched user:', user._id);
    return h.response({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUser:', error);
    return Boom.badImplementation('Error saat mengambil data user');
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (request, h) => {
  try {
    console.log('createUser - Auth credentials:', request.auth.credentials);
    console.log('createUser - Request payload:', request.payload);

    // Check if user is admin
    if (request.auth.credentials.role !== 'admin') {
      console.log('createUser - Access denied: User is not admin');
      return Boom.forbidden('Akses ditolak. Hanya admin yang diizinkan.');
    }

    const { email } = request.payload;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('createUser - Email already exists:', email);
      return Boom.badRequest('Email sudah terdaftar');
    }

    // Create user
    user = await User.create(request.payload);
    console.log('createUser - Successfully created user:', user._id);

    return h.response({
      success: true,
      message: 'User berhasil dibuat',
      data: user
    }).code(201);
  } catch (error) {
    console.error('Error in createUser:', error);
    return Boom.badImplementation('Error saat membuat user');
  }
};

// @desc    Update user
// @route   PUT /api/users/{id}
// @access  Private/Admin
exports.updateUser = async (request, h) => {
  try {
    console.log('updateUser - Auth credentials:', request.auth.credentials);
    console.log('updateUser - User ID:', request.params.id);
    console.log('updateUser - Update data:', request.payload);

    // Check if user is admin
    if (request.auth.credentials.role !== 'admin') {
      console.log('updateUser - Access denied: User is not admin');
      return Boom.forbidden('Akses ditolak. Hanya admin yang diizinkan.');
    }

    const { id } = request.params;
    const updateData = { ...request.payload };

    // If password is being updated, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('updateUser - User not found');
      return Boom.notFound('User tidak ditemukan');
    }

    console.log('updateUser - Successfully updated user:', user._id);
    return h.response({
      success: true,
      message: 'User berhasil diupdate',
      data: user
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    return Boom.badImplementation('Error saat mengupdate user');
  }
};

// @desc    Delete user
// @route   DELETE /api/users/{id}
// @access  Private/Admin
exports.deleteUser = async (request, h) => {
  try {
    console.log('deleteUser - Auth credentials:', request.auth.credentials);
    console.log('deleteUser - User ID to delete:', request.params.id);

    // Check if user is admin
    if (request.auth.credentials.role !== 'admin') {
      console.log('deleteUser - Access denied: User is not admin');
      return Boom.forbidden('Akses ditolak. Hanya admin yang diizinkan.');
    }

    const user = await User.findByIdAndDelete(request.params.id);

    if (!user) {
      console.log('deleteUser - User not found');
      return Boom.notFound('User tidak ditemukan');
    }

    console.log('deleteUser - Successfully deleted user:', request.params.id);
    return h.response({
      success: true,
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return Boom.badImplementation('Error saat menghapus user');
  }
};

// @desc    Upload profile photo
// @route   POST /users/upload-photo
// @access  Private
exports.uploadProfilePhoto = async (request, h) => {
  try {
    const file = request.payload.file;
    
    if (!file) {
      return h.response({
        success: false,
        message: 'Tidak ada file yang diupload'
      }).code(400);
    }

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.hapi.headers['content-type'])) {
      return h.response({
        success: false,
        message: 'Format file tidak didukung. Gunakan jpg, jpeg, atau png'
      }).code(400);
    }

    // Upload ke Cloudinary
    const result = await new Promise((resolve, reject) => {
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
    const user = await User.findByIdAndUpdate(
      request.auth.credentials.id,
      { photo: result.secure_url },
      { new: true }
    );

    return h.response({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        preferences: user.preferences,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return h.response({
      success: false,
      message: 'Gagal mengupload foto'
    }).code(500);
  }
};
