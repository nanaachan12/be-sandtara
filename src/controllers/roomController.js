const Boom = require('@hapi/boom');
const Room = require('../models/Room');
const { cloudinary } = require('../config/cloudinary');

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

      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/rooms',
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );

              file.pipe(uploadStream);
            });

            // Add Cloudinary URL to images array
            imagePaths.push(result.secure_url);
          } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
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
    let newImagePaths = [];
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];

      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/rooms',
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );

              file.pipe(uploadStream);
            });

            // Add Cloudinary URL to images array
            newImagePaths.push(result.secure_url);
          } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            return Boom.badImplementation('Error saat mengupload gambar');
          }
        }
      }
    }

    // Handle remaining images
    let remainingImages = [];
    if (payload.remainingImages) {
      try {
        remainingImages = JSON.parse(payload.remainingImages);
      } catch (error) {
        console.error('Error parsing remainingImages:', error);
      }
    }

    // Delete removed images from Cloudinary
    const removedImages = room.images.filter(img => !remainingImages.includes(img));
    for (const imageUrl of removedImages) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`santaratrip/rooms/${publicId}`);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    // Parse amenities if they come as string
    let amenities = room.amenities;
    if (payload.amenities) {
      amenities = typeof payload.amenities === 'string' ? 
        JSON.parse(payload.amenities) : payload.amenities;
    }

    // Update room data
    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      {
        name: payload.name || room.name,
        roomNumber: payload.roomNumber || room.roomNumber,
        hotel: payload.hotel || room.hotel,
        type: payload.type || room.type,
        price: payload.price ? parseFloat(payload.price) : room.price,
        capacity: {
          adults: payload.adults ? parseInt(payload.adults) : room.capacity.adults,
          children: payload.children ? parseInt(payload.children) : room.capacity.children
        },
        bedType: payload.bedType || room.bedType,
        size: payload.size ? parseFloat(payload.size) : room.size,
        amenities: amenities,
        images: [...remainingImages, ...newImagePaths],
        description: payload.description || room.description,
        status: payload.status || room.status,
        quantity: {
          total: payload.totalQuantity ? parseInt(payload.totalQuantity) : room.quantity.total,
          available: payload.totalQuantity ? parseInt(payload.totalQuantity) : room.quantity.available
        }
      },
      { new: true }
    );

    return h.response({
      success: true,
      message: 'Kamar berhasil diupdate',
      data: updatedRoom
    });
  } catch (error) {
    console.error('Error updating room:', error);
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

    // Delete images from Cloudinary
    if (room.images && room.images.length > 0) {
      for (const imageUrl of room.images) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
          await cloudinary.uploader.destroy(`santaratrip/rooms/${publicId}`);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

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