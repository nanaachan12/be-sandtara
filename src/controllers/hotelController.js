const Boom = require('@hapi/boom');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');

// @desc    Mendapatkan semua hotel
// @route   GET /api/hotels
// @access  Public
exports.getAllHotels = async (request, h) => {
  try {
    const hotels = await Hotel.find().select('-__v');
    
    return h.response({
      success: true,
      data: hotels
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return Boom.badImplementation('Error saat mengambil data hotel');
  }
};

// @desc    Mendapatkan detail hotel
// @route   GET /api/hotels/{id}
// @access  Public
exports.getHotelDetail = async (request, h) => {
  try {
    const { id } = request.params;
    
    const hotel = await Hotel.findById(id).select('-__v');
    
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }

    // Get rooms for this hotel
    const rooms = await Room.find({ hotel: id }).select('-__v');
    
    const result = {
      ...hotel.toObject(),
      rooms: rooms
    };
    
    return h.response({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching hotel:', error);
    return Boom.badImplementation('Error saat mengambil data hotel');
  }
};

// @desc    Membuat hotel baru
// @route   POST /api/hotels
// @access  Private/Admin
exports.createHotel = async (request, h) => {
  try {
    const payload = request.payload;

    // Handle multiple file uploads
    const imagePaths = [];
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];

      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/hotels',
                  transformation: [{ width: 1200, height: 800, crop: 'limit' }]
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              
              file.pipe(stream);
            });
            
            // Save Cloudinary URL
            imagePaths.push(result.secure_url);
          } catch (uploadError) {
            console.error('Error uploading file to Cloudinary:', uploadError);
            return Boom.badImplementation('Error saat mengupload gambar');
          }
        }
      }
    }

    // Parse facilities if they come as string
    let facilities = payload.facilities;
    if (typeof payload.facilities === 'string') {
      try {
        facilities = JSON.parse(payload.facilities);
      } catch (error) {
        return Boom.badRequest('Format fasilitas tidak valid');
      }
    }

    // Create hotel object
    const hotel = new Hotel({
      name: payload.name,
      description: payload.description,
      location: {
        type: 'Point',
        coordinates: payload.coordinates ? JSON.parse(payload.coordinates) : [0, 0],
        address: payload.address,
        city: payload.city,
        province: payload.province
      },
      facilities: facilities || [],
      images: imagePaths.length > 0 ? imagePaths : ['default-hotel.jpg'],
      checkInTime: payload.checkInTime || "14:00",
      checkOutTime: payload.checkOutTime || "12:00",
      policies: payload.policies ? JSON.parse(payload.policies) : [],
      status: payload.status || 'active',
      contactInfo: {
        phone: payload.phone,
        email: payload.email,
        website: payload.website
      }
    });

    await hotel.save();

    return h.response({
      success: true,
      message: 'Hotel berhasil ditambahkan',
      data: hotel
    }).code(201);
  } catch (error) {
    console.error('Error creating hotel:', error);
    return Boom.badImplementation('Error saat menambahkan hotel');
  }
};

// @desc    Mengupdate hotel
// @route   PUT /api/hotels/{id}
// @access  Private/Admin
exports.updateHotel = async (request, h) => {
  try {
    const { id } = request.params;
    const payload = request.payload;
    
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }

    // Handle image uploads
    if (payload.images) {
      const files = Array.isArray(payload.images) ? payload.images : [payload.images];
      const newImagePaths = [];

      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/hotels',
                  transformation: [{ width: 1200, height: 800, crop: 'limit' }]
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              
              file.pipe(stream);
            });
            
            // Save Cloudinary URL
            newImagePaths.push(result.secure_url);
          } catch (uploadError) {
            console.error('Error uploading file to Cloudinary:', uploadError);
            return Boom.badImplementation('Error saat mengupload gambar');
          }
        }
      }

      if (newImagePaths.length > 0) {
        hotel.images = [...hotel.images, ...newImagePaths];
      }
    }

    // Update fields
    if (payload.name) hotel.name = payload.name;
    if (payload.description) hotel.description = payload.description;
    if (payload.address) hotel.location.address = payload.address;
    if (payload.city) hotel.location.city = payload.city;
    if (payload.province) hotel.location.province = payload.province;
    if (payload.coordinates) hotel.location.coordinates = JSON.parse(payload.coordinates);
    if (payload.facilities) hotel.facilities = typeof payload.facilities === 'string' ? JSON.parse(payload.facilities) : payload.facilities;
    if (payload.checkInTime) hotel.checkInTime = payload.checkInTime;
    if (payload.checkOutTime) hotel.checkOutTime = payload.checkOutTime;
    if (payload.policies) hotel.policies = typeof payload.policies === 'string' ? JSON.parse(payload.policies) : payload.policies;
    if (payload.status) hotel.status = payload.status;
    if (payload.phone) hotel.contactInfo.phone = payload.phone;
    if (payload.email) hotel.contactInfo.email = payload.email;
    if (payload.website) hotel.contactInfo.website = payload.website;

    await hotel.save();

    return h.response({
      success: true,
      message: 'Hotel berhasil diperbarui',
      data: hotel
    });
  } catch (error) {
    console.error('Error updating hotel:', error);
    return Boom.badImplementation('Error saat mengupdate hotel');
  }
};

// @desc    Menghapus hotel
// @route   DELETE /api/hotels/{id}
// @access  Private/Admin
exports.deleteHotel = async (request, h) => {
  try {
    const { id } = request.params;
    
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }

    // Check if hotel has rooms
    const roomCount = await Room.countDocuments({ hotel: id });
    if (roomCount > 0) {
      return Boom.badRequest('Hotel tidak dapat dihapus karena masih memiliki kamar terkait');
    }

    // Delete images
    if (hotel.images && hotel.images.length > 0) {
      for (const imagePath of hotel.images) {
        if (imagePath !== 'default-hotel.jpg') {
          const fullPath = path.join(__dirname, '../..', imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    }

    await Hotel.findByIdAndDelete(id);

    return h.response({
      success: true,
      message: 'Hotel berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    return Boom.badImplementation('Error saat menghapus hotel');
  }
};

// @desc    Menghapus satu foto hotel
// @route   DELETE /api/hotels/{id}/images/{index}
// @access  Private/Admin
exports.deleteHotelImage = async (request, h) => {
  try {
    const { id, index } = request.params;
    
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }

    if (!hotel.images || index >= hotel.images.length) {
      return Boom.badRequest('Index foto tidak valid');
    }

    const imageUrl = hotel.images[index];
    if (imageUrl !== 'default-hotel.jpg') {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(`santaratrip/hotels/${publicId}`);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    hotel.images.splice(index, 1);
    await hotel.save();

    return h.response({
      success: true,
      message: 'Foto berhasil dihapus',
      data: hotel
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return Boom.badImplementation('Error saat menghapus foto');
  }
}; 