const path = require('path');
const fs = require('fs');
const Boom = require('@hapi/boom');
const Destination = require('../models/Destination');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const { cloudinary } = require('../config/cloudinary');

// Fungsi untuk menghitung jarak antara dua titik koordinat (dalam kilometer)
// Menggunakan rumus Haversine
// @desc    Mendapatkan semua destinasi
// @route   GET /api/wisata
// @access  Public
exports.getAllDestinations = async (request, h) => {
  try {
    const destinations = await Destination.find().select('-__v');
    
    return h.response({
      success: true,
      data: destinations
    });
  } catch (error) {
    return Boom.badImplementation('Error saat mengambil data destinasi');
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Jarak dalam kilometer
  return distance;
};

// @desc    Mendapatkan detail destinasi
// @route   GET /api/wisata/{id}
// @access  Public
exports.getDestinationDetail = async (request, h) => {
  try {
    const { id } = request.params;
    console.log('Fetching destination with ID:', id); // Debug log
    
    // Cari destinasi berdasarkan ID
    const destination = await Destination.findById(id);
    
    if (!destination) {
      console.log('Destination not found for ID:', id); // Debug log
      return Boom.notFound('Destinasi tidak ditemukan');
    }
    
    // Return data destinasi tanpa data tambahan untuk edit
    return h.response({
      success: true,
      data: destination
    });
  } catch (error) {
    console.error('Error fetching destination:', error); // Debug log
    return Boom.badImplementation('Error saat mengambil data destinasi');
  }
};

// @desc    Mendapatkan detail hotel
// @route   GET /hotel/{id}
// @access  Public
exports.getHotelDetail = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cari hotel berdasarkan ID
    const hotel = await Hotel.findById(id);
    
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }
    
    // Mendapatkan tipe kamar yang tersedia di hotel ini
    const rooms = await Room.find({ hotel: id });
    
    // Mendapatkan fasilitas hotel (simulasi data)
    const facilities = [
      {
        name: 'Swimming Pool',
        icon: '🏊‍♂️',
        description: 'Outdoor swimming pool with sun loungers'
      },
      {
        name: 'Restaurant',
        icon: '🍽️',
        description: 'On-site restaurant serving local and international cuisine'
      },
      {
        name: 'Spa',
        icon: '💆‍♀️',
        description: 'Full-service spa offering massages and treatments'
      },
      {
        name: 'Fitness Center',
        icon: '🏋️‍♂️',
        description: 'Fully equipped gym with modern equipment'
      },
      {
        name: 'Free WiFi',
        icon: '📶',
        description: 'High-speed internet access throughout the property'
      }
    ];
    
    // Mendapatkan ulasan hotel (simulasi data)
    const reviews = [
      {
        id: 'review1',
        user: 'John D.',
        rating: 4.5,
        comment: 'Great hotel with excellent service',
        date: '2025-03-15'
      },
      {
        id: 'review2',
        user: 'Sarah M.',
        rating: 5.0,
        comment: 'Perfect location and amazing facilities',
        date: '2025-03-10'
      },
      {
        id: 'review3',
        user: 'Michael R.',
        rating: 4.0,
        comment: 'Good value for money, would stay again',
        date: '2025-02-28'
      }
    ];
    
    // Gabungkan semua informasi
    const result = {
      ...hotel.toObject(),
      rooms: rooms.map(room => ({
        id: room._id,
        type: room.type,
        price: room.price,
        capacity: room.capacity,
        facilities: room.facilities,
        images: room.images
      })),
      facilities: facilities,
      reviews: reviews,
      averageRating: 4.5,
      totalReviews: 27,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      policies: [
        'No pets allowed',
        'No smoking in rooms',
        'Children welcome',
        'Credit card required at check-in'
      ],
      mapUrl: `https://maps.example.com/?lat=${hotel.location.coordinates[1]}&lng=${hotel.location.coordinates[0]}`
    };
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Mendapatkan semua hotel
// @route   GET /hotels
// @access  Public
exports.getAllHotels = async (request, h) => {
  try {
    const hotels = await Hotel.find().select('-__v');
    
    return {
      success: true,
      count: hotels.length,
      data: hotels
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Mendapatkan tipe kamar berdasarkan hotel
// @route   GET /admin/hotel/{hotelId}/rooms
// @access  Admin
exports.getRoomsByHotel = async (request, h) => {
  try {
    const { hotelId } = request.params;
    
    // Cek apakah hotel ada
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }
    
    // Mendapatkan semua tipe kamar untuk hotel ini
    const rooms = await Room.find({ hotel: hotelId });
    
    return {
      success: true,
      count: rooms.length,
      data: rooms
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Membuat destinasi baru
// @route   POST /api/wisata
// @access  Private/Admin
exports.createDestination = async (request, h) => {
  try {
    const payload = request.payload;
    console.log('Received payload:', payload);

    // Handle multiple file uploads
    const imagePaths = [];
    if (payload.gambar) {
      const files = Array.isArray(payload.gambar) ? payload.gambar : [payload.gambar];

      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/destinations',
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

    // Parse JSON strings jika ada
    let hariOperasional = [];
    let fasilitas = [];

    try {
      if (payload.hariOperasional) {
        if (typeof payload.hariOperasional === 'string') {
            hariOperasional = JSON.parse(payload.hariOperasional);
        } else {
          hariOperasional = payload.hariOperasional;
        }
      }

      if (payload.fasilitas) {
        if (typeof payload.fasilitas === 'string') {
            fasilitas = JSON.parse(payload.fasilitas);
        } else {
          fasilitas = payload.fasilitas;
        }
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return Boom.badRequest('Format data tidak valid');
    }

    // Validasi data yang diperlukan
    if (!payload.nama || !payload.kategori || !payload.harga || !payload.alamat || !payload.deskripsi || !payload.latitude || !payload.longitude) {
      console.error('Validasi gagal. Data wajib:', {
        nama: payload.nama,
        kategori: payload.kategori,
        harga: payload.harga,
        alamat: payload.alamat,
        deskripsi: payload.deskripsi,
        latitude: payload.latitude,
        longitude: payload.longitude
      });
      return Boom.badRequest('Semua field wajib diisi');
    }

    // Validasi format latitude dan longitude
    const latitude = parseFloat(payload.latitude);
    const longitude = parseFloat(payload.longitude);
    
    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return Boom.badRequest('Format latitude/longitude tidak valid');
    }

    // Buat destinasi baru
    const destination = new Destination({
      nama: payload.nama,
      kategori: payload.kategori,
      harga: parseInt(payload.harga),
      hariOperasional: hariOperasional,
      alamat: payload.alamat,
      kodePos: payload.kodePos || '',
      deskripsi: payload.deskripsi,
      fasilitas: fasilitas,
      gambar: imagePaths,
      jamBuka: payload.jamBuka || '',
      jamTutup: payload.jamTutup || '',
      status: payload.status || 'active',
      latitude: latitude,
      longitude: longitude
    });

    await destination.save();

    return h.response({
      success: true,
      message: 'Destinasi berhasil ditambahkan',
      data: destination
    }).code(201);
  } catch (error) {
    console.error('Error creating destination:', error);
    return Boom.badImplementation('Error saat menambahkan destinasi');
  }
};

// @desc    Mengupdate destinasi
// @route   PUT /api/wisata/{id}
// @access  Private/Admin
exports.updateDestination = async (request, h) => {
  try {
    const { id } = request.params;
    const payload = request.payload;
    console.log('Updating destination with ID:', id);
    console.log('Received payload:', payload);
    
    // Cek apakah destinasi ada
    const destination = await Destination.findById(id);
    if (!destination) {
      return Boom.notFound('Destinasi tidak ditemukan');
    }

    // Handle multiple file uploads
    let newImagePaths = [];
    if (payload.gambar) {
      const files = Array.isArray(payload.gambar) ? payload.gambar : [payload.gambar];

      for (const file of files) {
        if (file.hapi) {
          try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: 'santaratrip/destinations',
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
    const removedImages = destination.gambar.filter(img => !remainingImages.includes(img));
    for (const imageUrl of removedImages) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`santaratrip/destinations/${publicId}`);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    // Parse JSON strings if needed
    let hariOperasional = destination.hariOperasional;
    let fasilitas = destination.fasilitas;

    try {
      if (payload.hariOperasional) {
        if (typeof payload.hariOperasional === 'string') {
          hariOperasional = JSON.parse(payload.hariOperasional);
        } else {
          hariOperasional = payload.hariOperasional;
        }
      }

      if (payload.fasilitas) {
        if (typeof payload.fasilitas === 'string') {
          fasilitas = JSON.parse(payload.fasilitas);
        } else {
          fasilitas = payload.fasilitas;
        }
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return Boom.badRequest('Format data tidak valid');
    }

    // Validate latitude and longitude if provided
    let latitude = destination.latitude;
    let longitude = destination.longitude;
    
    if (payload.latitude && payload.longitude) {
      latitude = parseFloat(payload.latitude);
      longitude = parseFloat(payload.longitude);
      
      if (isNaN(latitude) || isNaN(longitude) || 
          latitude < -90 || latitude > 90 || 
          longitude < -180 || longitude > 180) {
        return Boom.badRequest('Format latitude/longitude tidak valid');
      }
    }

    // Update destination data
    const updatedDestination = await Destination.findByIdAndUpdate(
      id,
      {
        nama: payload.nama || destination.nama,
        kategori: payload.kategori || destination.kategori,
        harga: payload.harga ? parseInt(payload.harga) : destination.harga,
        hariOperasional: hariOperasional,
        alamat: payload.alamat || destination.alamat,
        kodePos: payload.kodePos || destination.kodePos,
        deskripsi: payload.deskripsi || destination.deskripsi,
        fasilitas: fasilitas,
        gambar: [...remainingImages, ...newImagePaths],
        jamBuka: payload.jamBuka || destination.jamBuka,
        jamTutup: payload.jamTutup || destination.jamTutup,
        status: payload.status || destination.status,
        latitude: latitude,
        longitude: longitude
      },
      { new: true }
    );

    return h.response({
      success: true,
      message: 'Destinasi berhasil diupdate',
      data: updatedDestination
    });
  } catch (error) {
    console.error('Error updating destination:', error);
    return Boom.badImplementation('Error saat mengupdate destinasi');
  }
};

// @desc    Menghapus destinasi
// @route   DELETE /api/wisata/{id}
// @access  Private/Admin
exports.deleteDestination = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cari destinasi yang akan dihapus
    const destination = await Destination.findById(id);
    
    if (!destination) {
      return Boom.notFound('Destinasi tidak ditemukan');
    }

    // Delete images from Cloudinary if they exist
    if (destination.gambar && destination.gambar.length > 0) {
      for (const imageUrl of destination.gambar) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
          await cloudinary.uploader.destroy(`santaratrip/destinations/${publicId}`);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    await Destination.findByIdAndDelete(id);
    
    return h.response({
      success: true,
      message: 'Destinasi berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting destination:', error);
    return Boom.badImplementation('Error saat menghapus destinasi');
  }
};

// @desc    Menghapus satu foto wisata
// @route   DELETE /api/wisata/{id}/foto/{fotoIndex}
// @access  Private/Admin
exports.deleteDestinationPhoto = async (request, h) => {
  try {
    const { id, fotoIndex } = request.params;
    
    // Cari destinasi yang akan diupdate
    const destination = await Destination.findById(id);
    
    if (!destination) {
      return Boom.notFound('Destinasi tidak ditemukan');
    }

    // Validasi index foto
    if (!destination.gambar || fotoIndex >= destination.gambar.length) {
      return Boom.badRequest('Index foto tidak valid');
    }

    // Hapus file fisik
    const fullPath = path.join(__dirname, '../..', destination.gambar[fotoIndex]);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Hapus path dari array gambar
    destination.gambar.splice(fotoIndex, 1);
    await destination.save();

    return h.response({
      success: true,
      message: 'Foto berhasil dihapus',
      data: destination
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return Boom.badImplementation('Error saat menghapus foto');
  }
};
