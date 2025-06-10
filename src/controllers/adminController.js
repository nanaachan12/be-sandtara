const Boom = require('@hapi/boom');
const { User, Destination, Hotel, Room, Event, Order } = require('../models');
const { cloudinary } = require('../config/cloudinary');
const excel = require('exceljs');

// @desc    Tambah destinasi
// @route   POST /admin/destinasi
// @access  Admin
exports.addDestination = async (request, h) => {
  try {
    const { name, detail, price, benefits, restrictions } = request.payload;
    
    // Menangani lokasi dari berbagai format (JSON atau form-data)
    let locationData;
    if (request.payload.location && typeof request.payload.location === 'object') {
      // Format JSON
      locationData = request.payload.location;
    } else {
      // Format form-data
      locationData = {
        address: request.payload['location.address'],
        city: request.payload['location.city'],
        province: request.payload['location.province'],
        coordinates: request.payload['location.coordinates']
      };
    }
    
    // Proses upload gambar jika ada
    let images = [];
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        for (const file of imageFiles) {
          // Upload ke Cloudinary
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
          
          images.push(result.secure_url);
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images.push(request.payload.images);
      }
    }
    
    // Buat destinasi baru
    let benefitsArray = [];
    if (benefits) {
      if (Array.isArray(benefits)) {
        benefitsArray = benefits;
      } else if (typeof benefits === 'string') {
        benefitsArray = benefits.split(',').map(item => item.trim());
      }
    }
    
    let restrictionsArray = [];
    if (restrictions) {
      if (Array.isArray(restrictions)) {
        restrictionsArray = restrictions;
      } else if (typeof restrictions === 'string') {
        restrictionsArray = restrictions.split(',').map(item => item.trim());
      }
    }
    
    const destination = await Destination.create({
      name,
      detail,
      price,
      benefits: benefitsArray,
      restrictions: restrictionsArray,
      images: images.length > 0 ? images : ['default-destination.jpg'],
      location: locationData
    });
    
    return {
      success: true,
      data: destination
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Tambah hotel
// @route   POST /admin/hotel
// @access  Admin
exports.addHotel = async (request, h) => {
  try {
    const { name, detail, price } = request.payload;
    
    // Menangani lokasi dari berbagai format (JSON atau form-data)
    let locationData;
    if (request.payload.location && typeof request.payload.location === 'object') {
      // Format JSON
      locationData = request.payload.location;
    } else {
      // Format form-data
      locationData = {
        address: request.payload['location.address'],
        city: request.payload['location.city'],
        province: request.payload['location.province'],
        coordinates: request.payload['location.coordinates']
      };
    }
    
    // Proses upload gambar jika ada
    let images = [];
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        for (const file of imageFiles) {
          // Upload ke Cloudinary
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
          
          images.push(result.secure_url);
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images.push(request.payload.images);
      }
    }
    
    // Buat hotel baru
    const hotel = await Hotel.create({
      name,
      detail,
      price,
      images: images.length > 0 ? images : ['default-hotel.jpg'],
      location: locationData
    });
    
    return {
      success: true,
      data: hotel
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Tambah tipe kamar
// @route   POST /admin/hotel/kamar
// @access  Admin
exports.addRoom = async (request, h) => {
  try {
    const { hotel, type, price, facilities, restrictions, capacity } = request.payload;
    
    // Cek apakah hotel ada
    const hotelExists = await Hotel.findById(hotel);
    if (!hotelExists) {
      return Boom.notFound('Hotel tidak ditemukan');
    }
    
    // Proses upload gambar jika ada
    let images = [];
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        for (const file of imageFiles) {
          // Upload ke Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'santaratrip/rooms',
                transformation: [{ width: 1200, height: 800, crop: 'limit' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            file.pipe(stream);
          });
          
          images.push(result.secure_url);
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images.push(request.payload.images);
      }
    }
    
    // Buat tipe kamar baru
    const room = await Room.create({
      hotel,
      type,
      price,
      facilities: facilities ? facilities.split(',').map(item => item.trim()) : [],
      restrictions: restrictions ? restrictions.split(',').map(item => item.trim()) : [],
      capacity,
      images: images.length > 0 ? images : ['default-room.jpg']
    });
    
    return {
      success: true,
      data: room
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Tambah event
// @route   POST /admin/event
// @access  Admin
exports.addEvent = async (request, h) => {
  try {
    const { name, detail, price, startDate, endDate, capacity } = request.payload;
    
    // Menangani lokasi dari berbagai format (JSON atau form-data)
    let locationData;
    if (request.payload.location && typeof request.payload.location === 'object') {
      // Format JSON
      locationData = request.payload.location;
    } else {
      // Format form-data
      locationData = {
        address: request.payload['location.address'],
        city: request.payload['location.city'],
        province: request.payload['location.province'],
        coordinates: request.payload['location.coordinates']
      };
    }
    
    // Proses upload gambar jika ada
    let images = [];
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        for (const file of imageFiles) {
          // Upload ke Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'santaratrip/events',
                transformation: [{ width: 1200, height: 800, crop: 'limit' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            file.pipe(stream);
          });
          
          images.push(result.secure_url);
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images.push(request.payload.images);
      }
    }
    
    // Buat event baru
    const event = await Event.create({
      name,
      detail,
      price,
      startDate,
      endDate,
      images: images.length > 0 ? images : ['default-event.jpg'],
      location: locationData,
      capacity
    });
    
    return {
      success: true,
      data: event
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Lihat semua user
// @route   GET /admin/users
// @access  Admin
exports.getAllUsers = async (request, h) => {
  try {
    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpire');
    
    return {
      success: true,
      count: users.length,
      data: users
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Update destinasi
// @route   PUT /admin/destinasi/{id}
// @access  Admin
exports.updateDestination = async (request, h) => {
  try {
    const { id } = request.params;
    const { name, detail, price, benefits, restrictions } = request.payload;
    
    // Cek apakah destinasi ada
    const destinationExists = await Destination.findById(id);
    if (!destinationExists) {
      return Boom.notFound('Destinasi tidak ditemukan');
    }
    
    // Menangani lokasi dari berbagai format (JSON atau form-data)
    let locationData;
    if (request.payload.location && typeof request.payload.location === 'object') {
      // Format JSON
      locationData = request.payload.location;
    } else {
      // Format form-data
      locationData = {
        address: request.payload['location.address'] || destinationExists.location.address,
        city: request.payload['location.city'] || destinationExists.location.city,
        province: request.payload['location.province'] || destinationExists.location.province,
        coordinates: request.payload['location.coordinates'] || destinationExists.location.coordinates,
        type: 'Point'
      };
    }
    
    // Proses upload gambar jika ada
    let images = destinationExists.images;
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        let uploadedImages = [];
        for (const file of imageFiles) {
          // Upload ke Cloudinary
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
          
          uploadedImages.push(result.secure_url);
        }
        
        if (uploadedImages.length > 0) {
          images = uploadedImages;
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images = [request.payload.images];
      }
    }
    
    // Persiapkan data benefits dan restrictions
    let benefitsArray = destinationExists.benefits;
    if (benefits) {
      if (Array.isArray(benefits)) {
        benefitsArray = benefits;
      } else if (typeof benefits === 'string') {
        benefitsArray = benefits.split(',').map(item => item.trim());
      }
    }
    
    let restrictionsArray = destinationExists.restrictions;
    if (restrictions) {
      if (Array.isArray(restrictions)) {
        restrictionsArray = restrictions;
      } else if (typeof restrictions === 'string') {
        restrictionsArray = restrictions.split(',').map(item => item.trim());
      }
    }
    
    // Update destinasi
    const destination = await Destination.findByIdAndUpdate(
      id,
      {
        name: name || destinationExists.name,
        detail: detail || destinationExists.detail,
        price: price || destinationExists.price,
        benefits: benefitsArray,
        restrictions: restrictionsArray,
        images: images,
        location: locationData
      },
      { new: true }
    );
    
    return {
      success: true,
      data: destination
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Hapus destinasi
// @route   DELETE /admin/destinasi/{id}
// @access  Admin
exports.deleteDestination = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cek apakah destinasi ada
    const destination = await Destination.findById(id);
    if (!destination) {
      return Boom.notFound('Destinasi tidak ditemukan');
    }
    
    // Hapus destinasi
    await Destination.findByIdAndDelete(id);
    
    return {
      success: true,
      message: 'Destinasi berhasil dihapus'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Update hotel
// @route   PUT /admin/hotel/{id}
// @access  Admin
exports.updateHotel = async (request, h) => {
  try {
    const { id } = request.params;
    const { name, detail, price } = request.payload;
    
    // Cek apakah hotel ada
    const hotelExists = await Hotel.findById(id);
    if (!hotelExists) {
      return Boom.notFound('Hotel tidak ditemukan');
    }
    
    // Menangani lokasi dari berbagai format (JSON atau form-data)
    let locationData;
    if (request.payload.location && typeof request.payload.location === 'object') {
      // Format JSON
      locationData = request.payload.location;
    } else {
      // Format form-data
      locationData = {
        address: request.payload['location.address'] || hotelExists.location.address,
        city: request.payload['location.city'] || hotelExists.location.city,
        province: request.payload['location.province'] || hotelExists.location.province,
        coordinates: request.payload['location.coordinates'] || hotelExists.location.coordinates
      };
    }
    
    // Proses upload gambar jika ada
    let images = hotelExists.images;
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        let uploadedImages = [];
        for (const file of imageFiles) {
          // Upload ke Cloudinary
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
          
          uploadedImages.push(result.secure_url);
        }
        
        if (uploadedImages.length > 0) {
          images = uploadedImages;
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images = [request.payload.images];
      }
    }
    
    // Update hotel
    const hotel = await Hotel.findByIdAndUpdate(
      id,
      {
        name: name || hotelExists.name,
        detail: detail || hotelExists.detail,
        price: price || hotelExists.price,
        images: images,
        location: locationData
      },
      { new: true }
    );
    
    return {
      success: true,
      data: hotel
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Hapus hotel
// @route   DELETE /admin/hotel/{id}
// @access  Admin
exports.deleteHotel = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cek apakah hotel ada
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }
    
    // Cek apakah ada kamar yang terkait dengan hotel ini
    const roomCount = await Room.countDocuments({ hotel: id });
    if (roomCount > 0) {
      return Boom.badRequest('Hotel tidak dapat dihapus karena masih memiliki kamar terkait');
    }
    
    // Hapus hotel
    await Hotel.findByIdAndDelete(id);
    
    return {
      success: true,
      message: 'Hotel berhasil dihapus'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Update event
// @route   PUT /admin/event/{id}
// @access  Admin
exports.updateEvent = async (request, h) => {
  try {
    const { id } = request.params;
    const { name, detail, price, startDate, endDate, capacity } = request.payload;
    
    // Cek apakah event ada
    const eventExists = await Event.findById(id);
    if (!eventExists) {
      return Boom.notFound('Event tidak ditemukan');
    }
    
    // Menangani lokasi dari berbagai format (JSON atau form-data)
    let locationData;
    if (request.payload.location && typeof request.payload.location === 'object') {
      // Format JSON
      locationData = request.payload.location;
    } else {
      // Format form-data
      locationData = {
        address: request.payload['location.address'] || eventExists.location.address,
        city: request.payload['location.city'] || eventExists.location.city,
        province: request.payload['location.province'] || eventExists.location.province,
        coordinates: request.payload['location.coordinates'] || eventExists.location.coordinates
      };
    }
    
    // Proses upload gambar jika ada
    let images = eventExists.images;
    if (request.payload.images) {
      // Periksa apakah request adalah multipart/form-data
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        let uploadedImages = [];
        for (const file of imageFiles) {
          // Upload ke Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'santaratrip/events',
                transformation: [{ width: 1200, height: 800, crop: 'limit' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            file.pipe(stream);
          });
          
          uploadedImages.push(result.secure_url);
        }
        
        if (uploadedImages.length > 0) {
          images = uploadedImages;
        }
      } else if (typeof request.payload.images === 'string') {
        // Jika images adalah string URL atau nama file
        images = [request.payload.images];
      }
    }
    
    // Update event
    const event = await Event.findByIdAndUpdate(
      id,
      {
        name: name || eventExists.name,
        detail: detail || eventExists.detail,
        price: price || eventExists.price,
        startDate: startDate || eventExists.startDate,
        endDate: endDate || eventExists.endDate,
        images: images,
        location: locationData,
        capacity: capacity || eventExists.capacity
      },
      { new: true }
    );
    
    return {
      success: true,
      data: event
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Hapus event
// @route   DELETE /admin/event/{id}
// @access  Admin
exports.deleteEvent = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cek apakah event ada
    const event = await Event.findById(id);
    if (!event) {
      return Boom.notFound('Event tidak ditemukan');
    }
    
    // Hapus event
    await Event.findByIdAndDelete(id);
    
    return {
      success: true,
      message: 'Event berhasil dihapus'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Hapus user
// @route   DELETE /admin/users/{id}
// @access  Admin
exports.deleteUser = async (request, h) => {
  try {
    const user = await User.findById(request.params.id);
    
    if (!user) {
      return Boom.notFound('User tidak ditemukan');
    }
    
    // Hapus foto profil dari Cloudinary jika bukan default
    if (user.photo !== 'default.jpg' && user.photo.includes('cloudinary')) {
      // Ekstrak public_id dari URL Cloudinary
      const publicId = user.photo.split('/').pop().split('.')[0];
      
      // Hapus gambar dari Cloudinary
      await cloudinary.uploader.destroy(`santaratrip/profiles/${publicId}`);
    }
    
    await user.deleteOne();
    
    return {
      success: true,
      message: 'User berhasil dihapus'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Lihat semua order
// @route   GET /admin/orders
// @access  Admin
exports.getAllOrders = async (request, h) => {
  try {
    console.log('Fetching all orders...');
    
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate({
        path: 'items.itemId',
        select: 'name type price images',
        refPath: 'items.itemType'
      })
      .sort({ createdAt: -1 });
    
    console.log(`Found ${orders.length} orders`);
    
    // Format orders to ensure consistent structure
    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      
      // Ensure user object exists
      if (!orderObj.user) {
        orderObj.user = { name: 'Deleted User', email: 'N/A' };
      }
      
      // Format dates
      orderObj.bookingDate = orderObj.bookingDate ? new Date(orderObj.bookingDate).toISOString() : null;
      orderObj.startDate = orderObj.startDate ? new Date(orderObj.startDate).toISOString() : null;
      orderObj.endDate = orderObj.endDate ? new Date(orderObj.endDate).toISOString() : null;
      orderObj.createdAt = orderObj.createdAt ? new Date(orderObj.createdAt).toISOString() : null;
      
      // Format items data
      if (orderObj.items && Array.isArray(orderObj.items)) {
        orderObj.items = orderObj.items.map(item => ({
          ...item,
          itemId: item.itemId || { name: 'Deleted Item', type: 'unknown', price: 0 }
        }));
      }
      
      return orderObj;
    });
    
    return {
      success: true,
      count: formattedOrders.length,
      data: formattedOrders
    };
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    
    // Handle specific error types
    if (error.name === 'CastError') {
      return h.response({
        success: false,
        message: 'Invalid ID format in query',
        error: error.message
      }).code(400);
    }
    
    if (error.name === 'ValidationError') {
      return h.response({
        success: false,
        message: 'Validation error',
        error: error.message
      }).code(400);
    }
    
    // Generic server error
    return h.response({
      success: false,
      message: 'Server Error',
      error: error.message
    }).code(500);
  }
};

// @desc    Update tipe kamar
// @route   PUT /admin/hotel/kamar/{id}
// @access  Admin
exports.updateRoom = async (request, h) => {
  try {
    const { id } = request.params;
    const { hotel, type, price, facilities, restrictions, capacity } = request.payload;
    
    // Cek apakah kamar ada
    const roomExists = await Room.findById(id);
    if (!roomExists) {
      return Boom.notFound('Kamar tidak ditemukan');
    }
    
    // Jika hotel diubah, cek apakah hotel baru ada
    if (hotel) {
      const hotelExists = await Hotel.findById(hotel);
      if (!hotelExists) {
        return Boom.notFound('Hotel tidak ditemukan');
      }
    }
    
    // Proses upload gambar jika ada
    let images = roomExists.images;
    if (request.payload.images) {
      if (request.headers['content-type'] && request.headers['content-type'].includes('multipart/form-data')) {
        const imageFiles = Array.isArray(request.payload.images) 
          ? request.payload.images 
          : [request.payload.images];
        
        let uploadedImages = [];
        for (const file of imageFiles) {
          // Upload ke Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'santaratrip/rooms',
                transformation: [{ width: 1200, height: 800, crop: 'limit' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            file.pipe(stream);
          });
          
          uploadedImages.push(result.secure_url);
        }
        
        if (uploadedImages.length > 0) {
          images = uploadedImages;
        }
      } else if (typeof request.payload.images === 'string') {
        images = [request.payload.images];
      }
    }
    
    // Update kamar
    const room = await Room.findByIdAndUpdate(
      id,
      {
        hotel: hotel || roomExists.hotel,
        type: type || roomExists.type,
        price: price || roomExists.price,
        facilities: facilities ? facilities.split(',').map(item => item.trim()) : roomExists.facilities,
        restrictions: restrictions ? restrictions.split(',').map(item => item.trim()) : roomExists.restrictions,
        capacity: capacity || roomExists.capacity,
        images: images
      },
      { new: true }
    );
    
    return {
      success: true,
      data: room
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Hapus tipe kamar
// @route   DELETE /admin/hotel/kamar/{id}
// @access  Admin
exports.deleteRoom = async (request, h) => {
  try {
    const { id } = request.params;
    
    // Cek apakah kamar ada
    const room = await Room.findById(id);
    if (!room) {
      return Boom.notFound('Kamar tidak ditemukan');
    }
    
    // Cek apakah ada order yang terkait dengan kamar ini
    const orderCount = await Order.countDocuments({ 'items.itemId': id, 'items.itemType': 'room' });
    if (orderCount > 0) {
      return Boom.badRequest('Kamar tidak dapat dihapus karena masih memiliki order terkait');
    }
    
    // Hapus kamar
    await Room.findByIdAndDelete(id);
    
    return {
      success: true,
      message: 'Kamar berhasil dihapus'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Export orderan ke file Excel
// @route   GET /admin/orders/excel
// @access  Admin
exports.exportOrdersToExcel = async (request, h) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.itemId');
    
    // Buat workbook dan worksheet baru
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Orders');
    
    // Tambahkan header
    worksheet.columns = [
      { header: 'Order ID', key: 'id', width: 30 },
      { header: 'User', key: 'user', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Tipe Order', key: 'orderType', width: 15 },
      { header: 'Total Harga', key: 'totalPrice', width: 15 },
      { header: 'Status Pembayaran', key: 'paymentStatus', width: 20 },
      { header: 'Metode Pembayaran', key: 'paymentMethod', width: 20 },
      { header: 'Tanggal Booking', key: 'bookingDate', width: 20 },
      { header: 'Tanggal Mulai', key: 'startDate', width: 20 },
      { header: 'Tanggal Selesai', key: 'endDate', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Tanggal Dibuat', key: 'createdAt', width: 20 }
    ];
    
    // Tambahkan data
    orders.forEach(order => {
      worksheet.addRow({
        id: order._id.toString(),
        user: order.user.name,
        email: order.user.email,
        orderType: order.orderType,
        totalPrice: order.totalPrice,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        bookingDate: order.bookingDate,
        startDate: order.startDate,
        endDate: order.endDate,
        status: order.status,
        createdAt: order.createdAt
      });
    });
    
    // Format kolom tanggal
    worksheet.getColumn('bookingDate').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('startDate').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('endDate').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('createdAt').numFmt = 'dd/mm/yyyy';
    
    // Buat file Excel
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Kirim file sebagai response
    return h.response(buffer)
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename=orders.xlsx');
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Lihat detail order
// @route   GET /admin/orders/{id}
// @access  Admin
exports.getOrderDetail = async (request, h) => {
  try {
    const { id } = request.params;
    
    console.log('Fetching order details:', { orderId: id });
    
    // Find order and populate necessary fields
    const order = await Order.findById(id)
      .populate('user', 'name email')
      .populate({
        path: 'items.itemId',
        select: 'name type price images nama',
        refPath: 'items.itemType'
      });

    if (!order) {
      console.log('Order not found:', id);
      return Boom.notFound('Order tidak ditemukan');
    }

    console.log('Order found:', {
      orderId: order._id,
      orderType: order.orderType,
      status: order.status,
      paymentStatus: order.paymentStatus
    });

    // Format the order
    const orderObj = order.toObject();
    
    // For destination orders, combine start/end date into visitDate
    if (orderObj.orderType === 'destination') {
      orderObj.visitDate = orderObj.startDate;
      delete orderObj.startDate;
      delete orderObj.endDate;
    }

    return {
      success: true,
      data: orderObj
    };
  } catch (error) {
    console.error('Error in getOrderDetail:', error);
    return Boom.badImplementation('Server Error');
  }
};
