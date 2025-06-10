'use strict';

const jwt = require('jsonwebtoken');
const Boom = require('@hapi/boom');
const User = require('../models/User');

exports.auth = async (request, h) => {
  try {
    // Periksa apakah ada token
    if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer')) {
      throw Boom.unauthorized('Akses ditolak, token tidak ada');
    }

    // Ambil token dari header
    const token = request.headers.authorization.split(' ')[1];

    if (!token) {
      throw Boom.unauthorized('Akses ditolak, token tidak valid');
    }

    try {
      // Verifikasi token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia123');

      // Cari user berdasarkan ID dari token
      const user = await User.findById(decoded.id);
      if (!user) {
        throw Boom.unauthorized('User tidak ditemukan');
      }

      // Set user ke credentials
      request.auth.credentials = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      return h.continue;
    } catch (err) {
      throw Boom.unauthorized('Token tidak valid');
    }
  } catch (err) {
    throw err;
  }
};
