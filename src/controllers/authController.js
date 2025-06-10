const User = require('../models/User');
const Boom = require('@hapi/boom');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /auth/register
// @access  Public
exports.register = async (request, h) => {
  try {
    const { name, email, password, role } = request.payload;

    // Cek apakah email sudah terdaftar
    const userExists = await User.findOne({ email });
    if (userExists) {
      return Boom.badRequest('Email sudah terdaftar');
    }

    // Generate verification code (6 digits)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set verification code expiration (30 minutes)
    const verificationExpire = Date.now() + 30 * 60 * 1000;

    // Buat user baru
    const userData = {
      name,
      email,
      password,
      verificationCode,
      verificationExpire,
      isVerified: false
    };

    // Jika role disediakan, gunakan role tersebut
    if (role) {
      userData.role = role;
    }

    const user = await User.create(userData);

    // Import fungsi sendEmail
    const sendEmail = require('../utils/sendEmail');

    // Buat pesan email verifikasi
    const message = `
      <h1>Verifikasi Akun SantaraTrip</h1>
      <p>Terima kasih telah mendaftar di SantaraTrip!</p>
      <p>Kode verifikasi Anda adalah:</p>
      <h2 style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px;">${verificationCode}</h2>
      <p>Kode ini akan berlaku selama 30 menit.</p>
      <p>Silakan masukkan kode ini pada halaman verifikasi untuk mengaktifkan akun Anda.</p>
    `;

    try {
      // Kirim email verifikasi
      await sendEmail({
        email: user.email,
        subject: 'SantaraTrip - Verifikasi Akun',
        message
      });

      return h.response({
        success: true,
        message: 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }).code(201);
    } catch (err) {
      console.error('Error sending verification email:', err);
      
      // Jika gagal mengirim email, tetap buat user tapi beri pesan error
      return h.response({
        success: true,
        message: 'Pendaftaran berhasil, tetapi gagal mengirim email verifikasi. Silakan hubungi admin.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }).code(201);
    }
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Login user
// @route   POST /auth/login
// @access  Public
exports.login = async (request, h) => {
  try {
    const { email, password } = request.payload;

    // Cek apakah user ada
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return Boom.unauthorized('Email atau password salah');
    }

    // Cek apakah password benar
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return Boom.unauthorized('Email atau password salah');
    }

    // Cek apakah email sudah diverifikasi
    if (!user.isVerified) {
      return Boom.forbidden('Akun belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu.');
    }

    // Generate token
    const token = generateToken(user._id);

    return {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role || 'user'
      }
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Forgot password
// @route   POST /auth/forgot-password
// @access  Public
exports.forgotPassword = async (request, h) => {
  try {
    const { email } = request.payload;

    const user = await User.findOne({ email });
    if (!user) {
      return Boom.badRequest('Tidak ada user dengan email tersebut');
    }

    // Generate reset code (6 digits)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash code dan set ke resetPasswordToken field
    user.resetPasswordToken = resetCode;

    // Set expire
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 menit

    await user.save({ validateBeforeSave: false });

    // Buat pesan email
    const message = `
      <h1>Reset Password</h1>
      <p>Anda menerima email ini karena Anda (atau seseorang) telah meminta reset password untuk akun Anda.</p>
      <p>Kode reset password Anda adalah:</p>
      <h2 style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px;">${resetCode}</h2>
      <p>Masukkan kode ini pada halaman reset password untuk mengatur ulang password Anda.</p>
      <p>Jika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap tidak berubah.</p>
      <p>Kode ini hanya berlaku selama 10 menit.</p>
    `;

    try {
      // Import fungsi sendEmail
      const sendEmail = require('../utils/sendEmail');

      // Kirim email
      await sendEmail({
        email: user.email,
        subject: 'SantaraTrip - Reset Password',
        message
      });

      return {
        success: true,
        message: 'Kode reset password telah dikirim ke email Anda'
      };
    } catch (err) {
      console.error('Error sending email:', err);
      
      // Jika gagal mengirim email, hapus token dari database
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return Boom.badImplementation('Email tidak dapat dikirim');
    }
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Reset password
// @route   POST /auth/reset-password
// @access  Public
exports.resetPassword = async (request, h) => {
  try {
    const { email, code, password } = request.payload;

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return Boom.badRequest('Kode reset tidak valid atau sudah kadaluarsa');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new token
    const newToken = generateToken(user._id);

    return {
      success: true,
      message: 'Password berhasil diubah',
      token: newToken
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Verify email with code
// @route   POST /auth/verify-email
// @access  Public
exports.verifyEmail = async (request, h) => {
  try {
    const { email, code } = request.payload;

    // Cari user dengan email dan kode verifikasi
    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return Boom.badRequest('Kode verifikasi tidak valid atau sudah kadaluarsa');
    }

    // Update user menjadi terverifikasi
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpire = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    return {
      success: true,
      message: 'Email berhasil diverifikasi',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role || 'user'
      }
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Resend verification code
// @route   POST /auth/resend-verification
// @access  Public
exports.resendVerification = async (request, h) => {
  try {
    const { email } = request.payload;

    // Cari user dengan email
    const user = await User.findOne({ email });
    if (!user) {
      return Boom.badRequest('Email tidak terdaftar');
    }

    // Jika user sudah terverifikasi
    if (user.isVerified) {
      return Boom.badRequest('Email sudah terverifikasi');
    }

    // Generate verification code baru (6 digits)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set verification code expiration (30 minutes)
    user.verificationCode = verificationCode;
    user.verificationExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    // Import fungsi sendEmail
    const sendEmail = require('../utils/sendEmail');

    // Buat pesan email verifikasi
    const message = `
      <h1>Verifikasi Akun SantaraTrip</h1>
      <p>Berikut adalah kode verifikasi baru Anda:</p>
      <h2 style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px;">${verificationCode}</h2>
      <p>Kode ini akan berlaku selama 30 menit.</p>
      <p>Silakan masukkan kode ini pada halaman verifikasi untuk mengaktifkan akun Anda.</p>
    `;

    try {
      // Kirim email verifikasi
      await sendEmail({
        email: user.email,
        subject: 'SantaraTrip - Kode Verifikasi Baru',
        message
      });

      return {
        success: true,
        message: 'Kode verifikasi baru telah dikirim ke email Anda'
      };
    } catch (err) {
      console.error('Error sending verification email:', err);
      return Boom.badImplementation('Gagal mengirim email verifikasi');
    }
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// Fungsi untuk generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'rahasia123', {
    expiresIn: '30d'
  });
};
