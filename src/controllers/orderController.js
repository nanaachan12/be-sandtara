const Boom = require('@hapi/boom');
const Order = require('../models/Order');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const Destination = require('../models/Destination');
const Review = require('../models/Review');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const { snap } = require('../config/midtrans');
const { cloudinary } = require('../config/cloudinary');
const { coreApi } = require('../config/midtrans');
const Event = require('../models/Event');

// @desc    Booking hotel
// @route   POST /order/hotel
// @access  Private
exports.bookHotel = async (request, h) => {
  try {
    const { hotelId, roomId, startDate, endDate, quantity, paymentMethod, notes } = request.payload;
    const user = request.auth.credentials;

    console.log('Booking request:', {
      hotelId,
      roomId,
      startDate,
      endDate,
      quantity,
      userId: user.id
    });

    // Cek apakah hotel ada
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return Boom.notFound('Hotel tidak ditemukan');
    }

    // Cek apakah room ada
    const room = await Room.findById(roomId);
    if (!room) {
      return Boom.notFound('Tipe kamar tidak ditemukan');
    }

    console.log('Room found:', {
      id: room._id,
      type: room.type,
      available: room.available,
      capacity: room.capacity,
      booked: room.booked || 0
    });

    // Cek apakah room tersedia
    if (!room.available) {
      console.log('Room not available');
      return Boom.badRequest('Kamar tidak tersedia');
    }

    // Cek kapasitas kamar
    const currentBookings = await Order.find({
      'items.itemId': roomId,
      status: { $ne: 'cancelled' },
      paymentStatus: { $ne: 'cancelled' },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    });

    console.log('Current bookings:', currentBookings.length);

    // Hitung total kamar yang sudah dipesan untuk periode yang sama
    const bookedRooms = currentBookings.reduce((total, booking) => {
      const bookingRoom = booking.items.find(item => item.itemId.toString() === roomId);
      return total + (bookingRoom ? bookingRoom.quantity : 0);
    }, 0);

    console.log('Room availability check:', {
      capacity: room.capacity,
      bookedRooms,
      requestedQuantity: quantity,
      available: (room.capacity - bookedRooms) >= quantity
    });

    if ((room.capacity - bookedRooms) < quantity) {
      return Boom.badRequest(`Hanya tersedia ${room.capacity - bookedRooms} kamar untuk periode ini`);
    }

    // Hitung total harga
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (days <= 0) {
      return Boom.badRequest('Tanggal check-in harus sebelum tanggal check-out');
    }

    const totalPrice = room.price * quantity * days;

    // Buat order baru
    const order = await Order.create({
      user: user.id,
      orderType: 'hotel',
      items: [{
        itemType: 'room',
        itemId: roomId,
        quantity,
        price: room.price
      }],
      totalPrice,
      paymentStatus: 'pending',
      paymentMethod,
      bookingDate: new Date(),
      startDate: start,
      endDate: end,
      notes
    });

    // Generate nomor invoice
    const invoiceNumber = `INV-${order._id.toString().slice(-6)}-${Date.now().toString().slice(-4)}`;

    // Kirim email konfirmasi
    const emailMessage = `
      <h1>Konfirmasi Booking Hotel</h1>
      <p>Terima kasih telah melakukan booking di SantaraTrip!</p>
      <p>Berikut detail booking Anda:</p>
      <ul>
        <li>Invoice: ${invoiceNumber}</li>
        <li>Hotel: ${hotel.name}</li>
        <li>Tipe Kamar: ${room.type}</li>
        <li>Check-in: ${new Date(startDate).toLocaleDateString('id-ID')}</li>
        <li>Check-out: ${new Date(endDate).toLocaleDateString('id-ID')}</li>
        <li>Jumlah Kamar: ${quantity}</li>
        <li>Total Harga: Rp ${totalPrice.toLocaleString('id-ID')}</li>
      </ul>
      <p>Silakan lakukan pembayaran sesuai metode yang dipilih.</p>
      <p>Terima kasih!</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SantaraTrip - Konfirmasi Booking Hotel',
        message: emailMessage
      });
    } catch (err) {
      console.error('Error sending email:', err);
      // Tidak menghentikan proses jika email gagal terkirim
    }

    // Generate payment token
    try {
      const paymentToken = await generatePaymentToken(order, user, hotel.name + ' - ' + room.type, invoiceNumber);
      return {
        success: true,
        data: order,
        invoiceNumber,
        paymentToken
      };
    } catch (error) {
      console.error('Error generating payment token:', error);
      return {
        success: true,
        data: order,
        invoiceNumber,
        error: 'Gagal membuat token pembayaran'
      };
    }
  } catch (error) {
    console.error('Error booking hotel:', error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Booking wisata
// @route   POST /order/wisata
// @access  Private
exports.bookWisata = async (request, h) => {
  try {
    console.group('Booking Wisata Process');
    const { destinationId, visitDate, quantity, paymentMethod, notes } = request.payload;
    const user = request.auth.credentials;

    console.log('Request Payload:', {
      destinationId,
      visitDate,
      quantity,
      paymentMethod,
      notes,
      userId: user.id
    });

    // Cek apakah destinasi ada
    const destination = await Destination.findById(destinationId);
    if (!destination) {
      console.error('Destination not found:', destinationId);
      console.groupEnd();
      return Boom.notFound('Destinasi tidak ditemukan');
    }

    console.log('Destination found:', {
      id: destination._id,
      nama: destination.nama,
      harga: destination.harga
    });

    // Hitung total harga
    const totalPrice = destination.harga * quantity;
    console.log('Price calculation:', {
      basePrice: destination.harga,
      quantity,
      totalPrice
    });

    // Parse dan validasi tanggal
    let parsedVisitDate;
    try {
      parsedVisitDate = new Date(visitDate);
      if (isNaN(parsedVisitDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      console.error('Date parsing error:', err);
      console.groupEnd();
      return Boom.badRequest('Format tanggal tidak valid');
    }

    console.log('Parsed visit date:', {
      original: visitDate,
      parsed: parsedVisitDate,
      iso: parsedVisitDate.toISOString()
    });

    // Buat order baru
    const orderData = {
      user: user.id,
      orderType: 'destination',
      items: [{
        itemType: 'destination',
        itemId: destinationId,
        quantity,
        price: destination.harga
      }],
      totalPrice,
      paymentStatus: 'pending',
      paymentMethod,
      bookingDate: new Date(),
      startDate: parsedVisitDate,
      endDate: parsedVisitDate,
      notes
    };

    console.log('Creating order with data:', orderData);

    const order = await Order.create(orderData);
    console.log('Order created:', order._id);

    // Generate nomor invoice
    const invoiceNumber = `INV-${order._id.toString().slice(-6)}-${Date.now().toString().slice(-4)}`;
    console.log('Generated invoice number:', invoiceNumber);

    // Kirim email konfirmasi
    const emailMessage = `
      <h1>Konfirmasi Booking Wisata</h1>
      <p>Terima kasih telah melakukan booking di SantaraTrip!</p>
      <p>Berikut detail booking Anda:</p>
      <ul>
        <li>Invoice: ${invoiceNumber}</li>
        <li>Destinasi: ${destination.nama}</li>
        <li>Tanggal Kunjungan: ${parsedVisitDate.toLocaleDateString('id-ID')}</li>
        <li>Jumlah Tiket: ${quantity}</li>
        <li>Total Harga: Rp ${totalPrice.toLocaleString('id-ID')}</li>
      </ul>
      <p>Silakan lakukan pembayaran sesuai metode yang dipilih.</p>
      <p>Terima kasih!</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SantaraTrip - Konfirmasi Booking Wisata',
        message: emailMessage
      });
      console.log('Confirmation email sent to:', user.email);
    } catch (err) {
      console.error('Error sending email:', err);
      // Tidak menghentikan proses jika email gagal terkirim
    }

    // Generate payment token
    try {
      console.log('Generating Midtrans payment token...');
      const paymentToken = await generatePaymentToken(order, user, destination.nama, invoiceNumber);
      console.log('Payment token generated:', paymentToken);
      
      console.groupEnd();
      return {
        success: true,
        data: order,
        invoiceNumber,
        paymentToken
      };
    } catch (error) {
      console.error('Error generating payment token:', error);
      console.groupEnd();
      return {
        success: true,
        data: order,
        invoiceNumber,
        error: 'Gagal membuat token pembayaran'
      };
    }
  } catch (error) {
    console.error('Unhandled error in bookWisata:', error);
    console.groupEnd();
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Booking event
// @route   POST /order/event
// @access  Private
exports.bookEvent = async (request, h) => {
  try {
    console.group('Booking Event Process');
    const { eventId, visitDate, quantity, paymentMethod, notes } = request.payload;
    const user = request.auth.credentials;

    console.log('Request Payload:', {
      eventId,
      visitDate,
      quantity,
      paymentMethod,
      notes,
      userId: user.id
    });

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      console.error('Event not found:', eventId);
      console.groupEnd();
      return Boom.notFound('Event tidak ditemukan');
    }

    console.log('Event found:', {
      id: event._id,
      name: event.name,
      price: event.price
    });

    // Check if event is active
    if (event.status !== 'active') {
      console.error('Event is not active:', event.status);
      console.groupEnd();
      return Boom.badRequest('Event tidak tersedia untuk pemesanan');
    }

    // Check if visit date is within event period
    const visitDateObj = new Date(visitDate);
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (visitDateObj < startDate || visitDateObj > endDate) {
      console.error('Visit date is outside event period:', {
        visit: visitDateObj,
        start: startDate,
        end: endDate
      });
      console.groupEnd();
      return Boom.badRequest(`Tanggal kunjungan harus antara ${startDate.toLocaleDateString()} dan ${endDate.toLocaleDateString()}`);
    }

    // Check capacity
    const existingOrders = await Order.find({
      'items.itemId': eventId,
      status: { $ne: 'cancelled' },
      paymentStatus: { $ne: 'cancelled' },
      startDate: visitDateObj
    });

    const totalBooked = existingOrders.reduce((total, order) => {
      const eventItem = order.items.find(item => item.itemId.toString() === eventId);
      return total + (eventItem ? eventItem.quantity : 0);
    }, 0);

    if (totalBooked + quantity > event.capacity) {
      console.error('Exceeds capacity:', {
        booked: totalBooked,
        requested: quantity,
        capacity: event.capacity
      });
      console.groupEnd();
      return Boom.badRequest(`Hanya tersedia ${event.capacity - totalBooked} tiket untuk tanggal ini`);
    }

    // Calculate total price
    const totalPrice = event.price * quantity;
    console.log('Price calculation:', {
      basePrice: event.price,
      quantity,
      totalPrice
    });

    // Create new order
    const orderData = {
      user: user.id,
      orderType: 'event',
      items: [{
        itemType: 'event',
        itemId: eventId,
        quantity,
        price: event.price
      }],
      totalPrice,
      paymentStatus: 'pending',
      paymentMethod,
      bookingDate: new Date(),
      startDate: visitDateObj,
      endDate: visitDateObj,
      notes
    };

    console.log('Creating order with data:', orderData);

    const order = await Order.create(orderData);
    console.log('Order created:', order._id);

    // Generate invoice number
    const invoiceNumber = `INV-${order._id.toString().slice(-6)}-${Date.now().toString().slice(-4)}`;
    console.log('Generated invoice number:', invoiceNumber);

    // Send confirmation email
    const emailMessage = `
      <h1>Konfirmasi Booking Event</h1>
      <p>Terima kasih telah melakukan booking di SantaraTrip!</p>
      <p>Berikut detail booking Anda:</p>
      <ul>
        <li>Invoice: ${invoiceNumber}</li>
        <li>Event: ${event.name}</li>
        <li>Tanggal: ${visitDateObj.toLocaleDateString('id-ID')}</li>
        <li>Jumlah Tiket: ${quantity}</li>
        <li>Total Harga: Rp ${totalPrice.toLocaleString('id-ID')}</li>
      </ul>
      <p>Silakan lakukan pembayaran sesuai metode yang dipilih.</p>
      <p>Terima kasih!</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SantaraTrip - Konfirmasi Booking Event',
        message: emailMessage
      });
      console.log('Confirmation email sent to:', user.email);
    } catch (err) {
      console.error('Error sending email:', err);
      // Don't stop process if email fails
    }

    // Generate payment token
    try {
      console.log('Generating Midtrans payment token...');
      const paymentToken = await generatePaymentToken(order, user, event.name, invoiceNumber);
      console.log('Payment token generated:', paymentToken);
      
      console.groupEnd();
      return {
        success: true,
        data: order,
        invoiceNumber,
        paymentToken
      };
    } catch (error) {
      console.error('Error generating payment token:', error);
      console.groupEnd();
      return {
        success: true,
        data: order,
        invoiceNumber,
        error: 'Gagal membuat token pembayaran'
      };
    }
  } catch (error) {
    console.error('Unhandled error in bookEvent:', error);
    console.groupEnd();
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Lihat semua order milik user
// @route   GET /order/user
// @access  Private
exports.getUserOrders = async (request, h) => {
  try {
    const user = request.auth.credentials;

    // Get orders and format them
    const orders = await Order.find({ user: user.id })
      .sort({ createdAt: -1 });

    // Format the orders
    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      
      // For destination orders, combine start/end date into visitDate
      if (orderObj.orderType === 'destination') {
        orderObj.visitDate = orderObj.startDate;
        delete orderObj.startDate;
        delete orderObj.endDate;
      }
      
      return orderObj;
    });

    return {
      success: true,
      count: orders.length,
      data: formattedOrders
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Detail order
// @route   GET /order/{id}
// @access  Private
exports.getOrderDetail = async (request, h) => {
  try {
    const user = request.auth.credentials;
    const { id } = request.params;
    const { transaction_status } = request.query;

    console.log('Fetching order details:', {
      orderId: id,
      userId: user.id,
      userRole: user.role,
      transactionStatus: transaction_status
    });

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
      orderUserId: order.user._id,
      requestUserId: user.id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus
    });

    // Check if this is a payment callback
    const isPaymentCallback = transaction_status === 'settlement' || 
                            transaction_status === 'capture' ||
                            transaction_status === 'pending';

    // Check authorization
    const isOwner = order.user._id.toString() === user.id;
    const isAdmin = user.role === 'admin';
    
    // Allow access if:
    // 1. User is the order owner
    // 2. User is an admin
    // 3. It's a payment callback with valid transaction status
    if (!isOwner && !isAdmin && !isPaymentCallback) {
      console.log('Access denied - unauthorized access attempt');
      return Boom.forbidden('Tidak diizinkan mengakses order ini');
    }

    // Update order status if needed for payment callbacks
    if (isPaymentCallback && transaction_status) {
      if (transaction_status === 'settlement' || transaction_status === 'capture') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
      } else if (transaction_status === 'pending') {
        order.paymentStatus = 'pending';
      } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
        order.paymentStatus = 'cancelled';
        order.status = 'cancelled';
      }
      await order.save();
    }

    // Format the order
    const orderObj = order.toObject();
    
    // For destination orders, combine start/end date into visitDate
    if (orderObj.orderType === 'destination') {
      orderObj.visitDate = orderObj.startDate;
      delete orderObj.startDate;
      delete orderObj.endDate;
    }

    // Add transaction status from callback if available
    if (transaction_status) {
      orderObj.transactionStatus = transaction_status;
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

// @desc    Kirim review hotel/wisata
// @route   POST /order/review
// @access  Private
exports.submitReview = async (request, h) => {
  try {
    const user = request.auth.credentials;
    const { orderId, itemId, itemType, rating, comment } = request.payload;

    // Cek apakah order ada
    const order = await Order.findById(orderId);
    if (!order) {
      return Boom.notFound('Order tidak ditemukan');
    }

    // Cek apakah item yang direview ada dalam order
    const orderItem = order.items.find(item => 
      item.itemId.toString() === itemId || 
      (item.itemType === 'room' && itemType === 'hotel')
    );

    if (!orderItem) {
      return Boom.badRequest('Item tidak ditemukan dalam order');
    }

    // Cek apakah sudah pernah review sebelumnya
    const existingReview = await Review.findOne({
      user: user.id,
      order: orderId,
      itemId
    });

    if (existingReview) {
      return Boom.badRequest('Anda sudah memberikan review untuk item ini');
    }

    // Upload foto jika ada
    let uploadedPhotos = [];
    if (request.payload.photos) {
      const photos = Array.isArray(request.payload.photos) 
        ? request.payload.photos 
        : [request.payload.photos];

      for (const photo of photos) {
        try {
          // Upload ke Cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'santaratrip/reviews',
                transformation: [{ width: 1200, height: 800, crop: 'limit' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            photo.pipe(stream);
          });
          
          uploadedPhotos.push(result.secure_url);
        } catch (error) {
          console.error('Error uploading review photo:', error);
          // Lanjutkan dengan foto lainnya jika ada error
        }
      }
    }

    // Buat review baru
    const review = await Review.create({
      user: user.id,
      order: orderId,
      itemType,
      itemId,
      rating,
      comment,
      photos: uploadedPhotos
    });

    return {
      success: true,
      data: review
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Kirim ulang tiket via email
// @route   GET /ticket/email
// @access  Private
exports.resendTicket = async (request, h) => {
  try {
    const user = request.auth.credentials;
    const { orderId } = request.query;

    // Cek apakah order ada
    const order = await Order.findById(orderId)
      .populate({
        path: 'items.itemId',
        select: 'name type'
      })
      .populate({
        path: 'user',
        select: 'name email'
      });

    if (!order) {
      return Boom.notFound('Order tidak ditemukan');
    }

    // Cek apakah order milik user yang sedang login
    if (order.user._id.toString() !== user.id && user.role !== 'admin') {
      return Boom.forbidden('Tidak diizinkan mengakses order ini');
    }

    // Cek apakah pembayaran sudah selesai
    if (order.paymentStatus !== 'paid') {
      return Boom.badRequest('Tiket hanya tersedia untuk order yang sudah dibayar');
    }

    // Kirim email tiket
    await sendTicketEmail(order);

    return {
      success: true,
      message: 'Tiket berhasil dikirim ke email Anda'
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Endpoint callback pembayaran berhasil
// @route   POST /payment/midtrans-notify
// @access  Public
exports.paymentNotification = async (request, h) => {
  try {
    console.log('Payment notification payload:', request.payload);
    
    // Ambil data dari payload
    const payload = request.payload;
    const orderId = payload.order_id;
    const transactionStatus = payload.transaction_status;
    const paymentType = payload.payment_type;
    
    console.log(`Processing payment: orderId=${orderId}, status=${transactionStatus}, type=${paymentType}`);
    
    // Cari order berdasarkan ID
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order tidak ditemukan: ${orderId}`);
      return h.response({
        statusCode: 404,
        error: 'Not Found',
        message: 'Order tidak ditemukan'
      }).code(404);
    }
    
    console.log(`Order ditemukan: ${order._id}`);
    
    // Update status pembayaran
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      order.paymentStatus = 'cancelled';
      order.status = 'cancelled';
    } else if (transactionStatus === 'pending') {
      order.paymentStatus = 'pending';
    }
    
    if (paymentType) {
      order.paymentMethod = paymentType;
    }
    
    // Simpan perubahan
    await order.save();
    console.log(`Order berhasil diupdate: status=${order.status}, paymentStatus=${order.paymentStatus}`);
    
    // Kirim email tiket jika pembayaran berhasil
    if (order.paymentStatus === 'paid') {
      try {
        // Populate user data dan item details untuk email
        await order.populate([
          { path: 'user' },
          { 
            path: 'items.itemId',
            model: order.orderType === 'hotel' ? 'Room' : 'Destination'
          }
        ]);
        
        await sendTicketEmail(order);
        console.log('Email tiket berhasil dikirim');
      } catch (error) {
        console.error('Gagal mengirim email tiket:', error.message);
      }
    }
    
    return h.response({
      success: true,
      message: 'Status pembayaran berhasil diperbarui',
      data: {
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    }).code(200);
  } catch (error) {
    console.error('Error pada payment notification:', error);
    return h.response({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Terjadi kesalahan pada server'
    }).code(500);
  }
};

// @desc    Cek status pembayaran
// @route   GET /payment/status/:orderId
// @access  Private
exports.checkPaymentStatus = async (request, h) => {
  try {
    const { orderId } = request.params;
    const user = request.auth.credentials;

    console.log('Checking payment status:', {
      orderId,
      userId: user.id,
      userRole: user.role
    });

    // Cari order berdasarkan ID
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('Order not found:', orderId);
      return h.response({
        success: false,
        message: 'Order tidak ditemukan'
      }).code(404);
    }

    console.log('Order found:', {
      orderId: order._id,
      orderUserId: order.user,
      requestUserId: user.id,
      userRole: user.role
    });

    // Cek apakah order milik user yang sedang login
    // Konversi kedua ID menjadi string untuk perbandingan yang konsisten
    const orderUserId = order.user.toString();
    const requestUserId = user.id.toString();

    console.log('Comparing IDs:', {
      orderUserId,
      requestUserId,
      userRole: user.role
    });

    if (orderUserId !== requestUserId && user.role !== 'admin') {
      console.log('Access denied:', {
        orderUserId,
        requestUserId,
        userRole: user.role
      });
      return h.response({
        success: false,
        message: 'Tidak diizinkan mengakses order ini'
      }).code(403);
    }

    // Cek status pembayaran di Midtrans
    try {
      const transactionStatus = await coreApi.transaction.status(orderId);
      
      // Update status pembayaran di database jika berbeda
      let statusChanged = false;
      if (transactionStatus.transaction_status === 'settlement' || transactionStatus.transaction_status === 'capture') {
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'confirmed';
          statusChanged = true;
        }
      } else if (transactionStatus.transaction_status === 'cancel' || transactionStatus.transaction_status === 'deny' || transactionStatus.transaction_status === 'expire') {
        if (order.paymentStatus !== 'cancelled') {
          order.paymentStatus = 'cancelled';
          order.status = 'cancelled';
          statusChanged = true;
        }
      } else if (transactionStatus.transaction_status === 'pending') {
        if (order.paymentStatus !== 'pending') {
          order.paymentStatus = 'pending';
          statusChanged = true;
        }
      }

      // Simpan perubahan jika ada
      if (statusChanged) {
        await order.save();
      }

      return h.response({
        success: true,
        data: {
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          midtransStatus: transactionStatus.transaction_status
        }
      }).code(200);
    } catch (error) {
      console.error('Error checking Midtrans status:', error);
      // Jika gagal mengecek di Midtrans, kembalikan status dari database
      return h.response({
        success: true,
        data: {
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          midtransStatus: null
        }
      }).code(200);
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    return h.response({
      success: false,
      message: 'Terjadi kesalahan saat mengecek status pembayaran'
    }).code(500);
  }
};

// @desc    Get payment token for pending order
// @route   GET /payment/token/{orderId}
// @access  Private
exports.getPaymentToken = async (request, h) => {
  try {
    const { orderId } = request.params;
    const user = request.auth.credentials;

    console.log('Payment token request:', {
      orderId,
      userId: user.id,
      userRole: user.role
    });

    // Cari order berdasarkan ID
    const order = await Order.findById(orderId);

    if (!order) {
      console.log('Order not found:', orderId);
      return h.response({
        success: false,
        message: 'Order tidak ditemukan'
      }).code(404);
    }

    console.log('Order found:', {
      orderId: order._id,
      orderUserId: order.user,
      requestUserId: user.id
    });

    // Cek apakah order milik user yang sedang login
    // Konversi kedua ID menjadi string untuk perbandingan yang konsisten
    const orderUserId = order.user.toString();
    const requestUserId = user.id.toString();

    console.log('Comparing IDs:', {
      orderUserId,
      requestUserId,
      match: orderUserId === requestUserId
    });

    if (orderUserId !== requestUserId && user.role !== 'admin') {
      console.log('Access denied - IDs do not match');
      return h.response({
        success: false,
        message: 'Tidak diizinkan mengakses order ini'
      }).code(403);
    }

    // Cek apakah order masih pending
    if (order.paymentStatus !== 'pending') {
      return h.response({
        success: false,
        message: 'Order sudah tidak dalam status pending'
      }).code(400);
    }

    // Jika sudah ada payment URL yang tersimpan, gunakan itu
    if (order.paymentUrl) {
      console.log('Using existing payment URL:', order.paymentUrl);
      return h.response({
        success: true,
        data: {
          redirectUrl: order.paymentUrl
        }
      }).code(200);
    }

    // Generate nama item berdasarkan tipe order
    let itemName = '';
    if (order.orderType === 'hotel') {
      const Room = require('../models/Room');
      const room = await Room.findById(order.items[0].itemId);
      itemName = room ? `${room.name} - ${room.type}` : 'Hotel Room';
    } else {
      const Destination = require('../models/Destination');
      const destination = await Destination.findById(order.items[0].itemId);
      itemName = destination ? destination.nama : 'Destination';
    }

    console.log('Generated item name:', itemName);

    // Generate payment token
    const paymentToken = await generatePaymentToken(
      order,
      user,
      itemName,
      `INV-${order._id.toString().slice(-6)}-${Date.now().toString().slice(-4)}`
    );

    console.log('Payment token generated successfully');

    return h.response({
      success: true,
      data: {
        token: paymentToken,
        redirectUrl: order.paymentUrl
      }
    }).code(200);
  } catch (error) {
    console.error('Error getting payment token:', error);
    return h.response({
      success: false,
      message: 'Terjadi kesalahan saat mengambil token pembayaran'
    }).code(500);
  }
};

// Fungsi untuk generate token pembayaran Midtrans
async function generatePaymentToken(order, user, itemName, invoiceNumber) {
  try {
    console.log('Generating Midtrans payment token for order:', order._id.toString());
    console.log('Midtrans Config:', { 
      serverKey: process.env.MIDTRANS_SERVER_KEY ? 'Set' : 'Not Set',
      clientKey: process.env.MIDTRANS_CLIENT_KEY ? 'Set' : 'Not Set',
      isProduction: process.env.MIDTRANS_IS_PRODUCTION
    });
    
    // Calculate duration for hotel bookings
    let duration = 1;
    if (order.orderType === 'hotel') {
      const start = new Date(order.startDate);
      const end = new Date(order.endDate);
      duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    // Prepare item details with proper duration for hotels
    const itemDetails = order.items.map(item => {
      if (order.orderType === 'hotel') {
        return {
          id: item.itemId.toString(),
          price: parseInt(item.price),
          quantity: parseInt(item.quantity) * duration, // Multiply by duration for hotels
          name: `${itemName} (${duration} malam)` // Add duration info to item name
        };
      }
      return {
        id: item.itemId.toString(),
        price: parseInt(item.price),
        quantity: parseInt(item.quantity),
        name: itemName || `${order.orderType === 'hotel' ? 'Hotel' : 'Wisata'} Booking`
      };
    });
    
    // Calculate gross amount from item_details
    const calculatedGrossAmount = itemDetails.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    console.log('Calculated gross amount:', calculatedGrossAmount);
    console.log('Order total price:', parseInt(order.totalPrice));
    
    // Prepare Midtrans parameters
    const parameter = {
      transaction_details: {
        order_id: order._id.toString(),
        gross_amount: calculatedGrossAmount
      },
      item_details: itemDetails,
      customer_details: {
        first_name: user.name ? user.name.split(' ')[0] : 'Customer',
        last_name: user.name ? (user.name.split(' ').slice(1).join(' ') || '') : '',
        email: user.email || 'customer@example.com',
        phone: user.phone || '08123456789'
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
        error: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/error`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending`
      },
      expiry: {
        unit: 'day',
        duration: 1
      }
    };

    console.log('Midtrans parameters:', JSON.stringify(parameter, null, 2));

    // Buat token pembayaran
    const transaction = await snap.createTransaction(parameter);
    console.log('Midtrans transaction response:', transaction);

    // Simpan redirect URL ke database
    if (transaction.redirect_url) {
      order.paymentUrl = transaction.redirect_url;
      await order.save();
    }

    return transaction.token;
  } catch (error) {
    console.error('Error generating Midtrans token:', error);
    console.error('Error details:', error.message, error.stack);
    throw error;
  }
}

// @desc    Get reviews for hotel/destination
// @route   GET /reviews/:itemType/:itemId
// @access  Public
exports.getReviews = async (request, h) => {
  try {
    const { itemType, itemId } = request.params;
    
    console.log('Getting reviews for:', { itemType, itemId });

    // Validate item type
    if (!['hotel', 'destination', 'room'].includes(itemType)) {
      return Boom.badRequest('Invalid item type');
    }

    let allReviews = [];
    
    if (itemType === 'hotel') {
      // First check if hotel exists
      const hotel = await Hotel.findById(itemId);
      if (!hotel) {
        console.log('Hotel not found:', itemId);
        return Boom.notFound('Hotel tidak ditemukan');
      }
      console.log('Found hotel:', hotel._id.toString());

      // Get all rooms that belong to this hotel
      const rooms = await Room.find({ hotel: hotel._id });
      console.log('Found rooms for hotel:', rooms.map(r => ({
        id: r._id.toString(),
        type: r.type,
        hotelId: r.hotel.toString()
      })));

      // Get all reviews for this hotel and its rooms
      const reviewQuery = {
        $or: [
          { itemId: hotel._id.toString() }, // Hotel reviews
          { itemId: { $in: rooms.map(r => r._id.toString()) } } // Room reviews
        ]
      };

      console.log('Review query:', JSON.stringify(reviewQuery, null, 2));

      allReviews = await Review.find(reviewQuery)
        .populate('user', 'name')
        .lean();

      console.log('Found reviews:', allReviews.map(r => ({
        id: r._id.toString(),
        itemId: r.itemId,
        itemType: r.itemType,
        rating: r.rating
      })));

    } else if (itemType === 'room') {
      // First check if room exists
      const room = await Room.findById(itemId);
      if (!room) {
        console.log('Room not found:', itemId);
        return Boom.notFound('Room tidak ditemukan');
      }

      console.log('Found room:', {
        roomId: room._id.toString(),
        hotelId: room.hotel.toString(),
        type: room.type
      });

      // Get all reviews for this room and its hotel
      const reviewQuery = {
        $or: [
          { itemId: room._id.toString() }, // Room reviews
          { itemId: room.hotel.toString() } // Hotel reviews
        ]
      };

      console.log('Review query:', JSON.stringify(reviewQuery, null, 2));

      allReviews = await Review.find(reviewQuery)
        .populate('user', 'name')
        .lean();

      console.log('Found reviews:', allReviews.map(r => ({
        id: r._id.toString(),
        itemId: r.itemId,
        itemType: r.itemType,
        rating: r.rating
      })));

    } else {
      // For destinations, just get destination reviews
      allReviews = await Review.find({
        itemType,
        itemId
      })
      .populate('user', 'name')
      .lean();
    }

    // Calculate average rating
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    // Log final response
    console.log('Sending response:', {
      totalReviews: allReviews.length,
      averageRating,
      reviewIds: allReviews.map(r => r._id.toString())
    });

    return {
      success: true,
      data: {
        reviews: allReviews,
        averageRating,
        totalReviews: allReviews.length
      }
    };
  } catch (error) {
    console.error('Error in getReviews:', error);
    return Boom.badImplementation('Server Error');
  }
};

// Fungsi helper untuk mengirim email tiket
async function sendTicketEmail(order) {
  try {
    // Generate nomor tiket
    const ticketNumber = `TIX-${order._id.toString().slice(-6)}-${Date.now().toString().slice(-4)}`;
    
    // Dapatkan detail item yang dipesan
    let itemName = '';
    let itemType = '';
    
    if (order.items[0].itemId.name) {
      itemName = order.items[0].itemId.name;
      itemType = order.items[0].itemId.type || order.orderType;
    }

    // Buat pesan email
    const emailMessage = `
      <h1>E-Tiket SantaraTrip</h1>
      <p>Terima kasih telah melakukan pemesanan di SantaraTrip!</p>
      <p>Berikut adalah e-tiket Anda:</p>
      <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0;">
        <h2>Tiket #${ticketNumber}</h2>
        <p><strong>Nama:</strong> ${order.user.name}</p>
        <p><strong>Email:</strong> ${order.user.email}</p>
        <p><strong>Jenis Pesanan:</strong> ${order.orderType === 'hotel' ? 'Hotel' : order.orderType === 'destination' ? 'Wisata' : 'Event'}</p>
        <p><strong>${order.orderType === 'hotel' ? 'Hotel' : order.orderType === 'destination' ? 'Destinasi' : 'Event'}:</strong> ${itemName}</p>
        ${order.orderType === 'hotel' ? `<p><strong>Tipe Kamar:</strong> ${itemType}</p>` : ''}
        <p><strong>Tanggal:</strong> ${new Date(order.startDate).toLocaleDateString('id-ID')} - ${new Date(order.endDate).toLocaleDateString('id-ID')}</p>
        <p><strong>Jumlah:</strong> ${order.items[0].quantity}</p>
        <p><strong>Total Harga:</strong> Rp ${order.totalPrice.toLocaleString('id-ID')}</p>
        <p><strong>Status Pembayaran:</strong> ${order.paymentStatus === 'paid' ? 'Lunas' : 'Menunggu Pembayaran'}</p>
      </div>
      <p>Silakan tunjukkan e-tiket ini saat check-in.</p>
      <p>Terima kasih telah menggunakan layanan SantaraTrip!</p>
    `;

    // Kirim email
    await sendEmail({
      email: order.user.email,
      subject: 'SantaraTrip - E-Tiket Anda',
      message: emailMessage
    });

    return true;
  } catch (error) {
    console.error('Error sending ticket email:', error);
    return false;
  }
}
