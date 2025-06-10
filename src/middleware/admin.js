const Boom = require('@hapi/boom');
const User = require('../models/User');

// Middleware untuk memeriksa apakah user adalah admin
exports.admin = async (request, h) => {
  try {
    // Pastikan user sudah login (auth middleware sudah dijalankan sebelumnya)
    if (!request.auth || !request.auth.credentials || !request.auth.credentials.id) {
      return Boom.unauthorized('Akses ditolak');
    }

    // Cari user berdasarkan ID
    const user = await User.findById(request.auth.credentials.id);

    // Periksa apakah user ada dan apakah role-nya admin
    if (!user || user.role !== 'admin') {
      return Boom.forbidden('Akses ditolak. Hanya admin yang dapat mengakses halaman ini');
    }

    // Lanjutkan ke handler berikutnya
    return h.continue;
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};
