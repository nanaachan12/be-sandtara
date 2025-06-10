const Boom = require('@hapi/boom');
const Room = require('../models/Room');
const fs = require('fs');
const path = require('path');

// @desc    Mendapatkan semua kamar
// @route   GET /api/rooms
// @access  Public
exports.getAllRooms = async (request, h) => {
  try {
    const rooms = await Room.find()
      .populate('hotel', 'name')
      .select('-__v');
    
    return h.response({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return Boom.badImplementation('Error saat mengambil data kamar');
  }
};

// @desc    Mendapatkan detail kamar
// @route   GET /api/rooms/{id}
// @access  Public
exports.getRoomDetail = async (request, h) => {
  try {
    const { id } = request.params;
    
    const room = await Room.findById(id)
      .populate('hotel', 'name')
      .select('-__v');
    
    if (!room) {
      return Boom.notFound('Kamar tidak ditemukan');
    }
    
    return h.response({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return Boom.badImplementation('Error saat mengambil data kamar');
  }
};

// @desc    Membuat kamar baru
// @route   POST /api/rooms
// @access  Private/Admin
exports.createRoom = async (request, h) => {
  try {
    const payload = request.payload;
    console.log('Received payload:', payload);

    // Check if roomNumber already exists
    const existingRoom = await Room.findOne({ roomNumber: payload.roomNumber });
    if (existingRoom) {
      return Boom.badRequest('Nomor kamar sudah digunakan');
    }

    // Handle multiple file uploads
    const imagePaths = [];
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];
      
      // Pastikan direktori uploads ada
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        if (file.hapi) {
          try {
            // Generate nama file yang unik
            const timestamp = Date.now();
            const originalName = file.hapi.filename;
            const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filepath = path.join(uploadDir, safeName);

            // Simpan file
            const fileStream = fs.createWriteStream(filepath);
            await new Promise((resolve, reject) => {
              file.pipe(fileStream);
              fileStream.on('finish', resolve);
              fileStream.on('error', reject);
            });

            // Simpan path relatif untuk akses browser
            imagePaths.push(`/uploads/${safeName}`);
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            return Boom.badImplementation('Error saat mengupload gambar');
          }
        }
      }
    }

    // Parse amenities if they come as string
    let amenities = [];
    if (payload.amenities) {
      amenities = typeof payload.amenities === 'string' ? 
        JSON.parse(payload.amenities) : payload.amenities;
    }

    // Create room object
    const room = new Room({
      name: payload.name,
      roomNumber: payload.roomNumber,
      hotel: payload.hotel,
      type: payload.type,
      price: parseFloat(payload.price),
      capacity: {
        adults: parseInt(payload.adults),
        children: parseInt(payload.children || 0)
      },
      bedType: payload.bedType,
      size: parseFloat(payload.size),
      amenities: amenities,
      images: imagePaths.length > 0 ? imagePaths : ['default-room.jpg'],
      description: payload.description,
      status: payload.status || 'available',
      quantity: {
        total: parseInt(payload.totalQuantity),
        available: parseInt(payload.totalQuantity)
      }
    });

    await room.save();

    return h.response({
      success: true,
      message: 'Kamar berhasil ditambahkan',
      data: room
    }).code(201);
  } catch (error) {
    console.error('Error creating room:', error);
    if (error.code === 11000) {
      return Boom.badRequest('Nomor kamar sudah digunakan');
    }
    return Boom.badImplementation('Error saat menambahkan kamar');
  }
};

// @desc    Mengupdate kamar
// @route   PUT /api/rooms/{id}
// @access  Private/Admin
exports.updateRoom = async (request, h) => {
  try {
    const { id } = request.params;
    const payload = request.payload;
    console.log('Updating room with ID:', id);
    console.log('Received payload:', payload);
    
    // Cari kamar yang akan diupdate
    const room = await Room.findById(id);
    
    if (!room) {
      return Boom.notFound('Kamar tidak ditemukan');
    }

    // Check if roomNumber is being changed and already exists
    if (payload.roomNumber && payload.roomNumber !== room.roomNumber) {
      const existingRoom = await Room.findOne({ roomNumber: payload.roomNumber });
      if (existingRoom) {
        return Boom.badRequest('Nomor kamar sudah digunakan');
      }
    }

    // Handle multiple file uploads
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];
      const newImagePaths = [];
      
      // Pastikan direktori uploads ada
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        if (file.hapi) {
          try {
            // Generate nama file yang unik
            const timestamp = Date.now();
            const originalName = file.hapi.filename;
            const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filepath = path.join(uploadDir, safeName);

            // Simpan file
            const fileStream = fs.createWriteStream(filepath);
            await new Promise((resolve, reject) => {
              file.pipe(fileStream);
              fileStream.on('finish', resolve);
              fileStream.on('error', reject);
            });

            // Simpan path relatif untuk akses browser
            newImagePaths.push(`/uploads/${safeName}`);
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            return Boom.badImplementation('Error saat mengupload gambar');
          }
        }
      }

      // Jika ada gambar baru, tambahkan ke array gambar yang sudah ada
      if (newImagePaths.length > 0) {
        room.images = [...(room.images || []), ...newImagePaths];
      }
    }

    // Parse amenities if they come as string
    let amenities = room.amenities;
    if (payload.amenities) {
      amenities = typeof payload.amenities === 'string' ? 
        JSON.parse(payload.amenities) : payload.amenities;
    }

    // Update fields
    room.name = payload.name || room.name;
    room.roomNumber = payload.roomNumber || room.roomNumber;
    room.hotel = payload.hotel || room.hotel;
    room.type = payload.type || room.type;
    room.price = payload.price ? parseFloat(payload.price) : room.price;
    room.capacity = {
      adults: payload.adults ? parseInt(payload.adults) : room.capacity.adults,
      children: payload.children ? parseInt(payload.children) : room.capacity.children
    };
    room.bedType = payload.bedType || room.bedType;
    room.size = payload.size ? parseFloat(payload.size) : room.size;
    room.amenities = amenities;
    room.description = payload.description || room.description;
    room.status = payload.status || room.status;
    room.quantity = {
      total: payload.totalQuantity ? parseInt(payload.totalQuantity) : room.quantity.total,
      available: payload.totalQuantity ? parseInt(payload.totalQuantity) : room.quantity.available
    };

    await room.save();

    return h.response({
      success: true,
      message: 'Kamar berhasil diperbarui',
      data: room
    });
  } catch (error) {
    console.error('Error updating room:', error);
    if (error.code === 11000) {
      return Boom.badRequest('Nomor kamar sudah digunakan');
    }
    return Boom.badImplementation('Error saat mengupdate kamar');
  }
};

// @desc    Menghapus kamar
// @route   DELETE /api/rooms/{id}
// @access  Private/Admin
exports.deleteRoom = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cari kamar yang akan dihapus
    const room = await Room.findById(id);
    
    if (!room) {
      return Boom.notFound('Kamar tidak ditemukan');
    }

    // Hapus gambar jika ada
    if (room.images && room.images.length > 0) {
      for (const imagePath of room.images) {
        if (imagePath !== 'default-room.jpg') {
          const fullPath = path.join(__dirname, '../..', imagePath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (err) {
              console.error('Error deleting image file:', err);
              // Continue with deletion even if image deletion fails
            }
          }
        }
      }
    }

    // Hapus kamar dari database
    await Room.findByIdAndDelete(id);

    return h.response({
      success: true,
      message: 'Kamar berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return Boom.badImplementation('Error saat menghapus kamar');
  }
};

// @desc    Menghapus satu foto kamar
// @route   DELETE /api/rooms/{id}/images/{index}
// @access  Private/Admin
exports.deleteRoomImage = async (request, h) => {
  try {
    const { id, index } = request.params;
    
    // Cari kamar yang akan diupdate
    const room = await Room.findById(id);
    
    if (!room) {
      return Boom.notFound('Kamar tidak ditemukan');
    }

    // Validasi index foto
    if (!room.images || index >= room.images.length) {
      return Boom.badRequest('Index foto tidak valid');
    }

    // Hapus file fisik
    if (room.images[index] !== 'default-room.jpg') {
      const fullPath = path.join(__dirname, '../..', room.images[index]);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Hapus path dari array gambar
    room.images.splice(index, 1);
    await room.save();

    return h.response({
      success: true,
      message: 'Foto berhasil dihapus',
      data: room
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return Boom.badImplementation('Error saat menghapus foto');
  }
}; 