const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama kamar harus diisi'],
    trim: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Nomor kamar harus diisi'],
    unique: true,
    trim: true
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel harus diisi']
  },
  type: {
    type: String,
    required: [true, 'Tipe kamar harus diisi']
  },
  price: {
    type: Number,
    required: [true, 'Harga kamar harus diisi']
  },
  capacity: {
    adults: {
      type: Number,
      required: [true, 'Kapasitas dewasa harus diisi'],
      min: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  available: {
    type: Boolean,
    default: true
  },
  facilities: [{
    type: String
  }],
  photos: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  bedType: {
    type: String,
    enum: ['single', 'twin', 'double', 'queen', 'king'],
    required: true
  },
  size: {
    type: Number, // in square meters
    required: true
  },
  amenities: [{
    type: String,
    enum: [
      'ac',
      'tv',
      'wifi',
      'minibar',
      'safe',
      'desk',
      'shower',
      'hairdryer',
      'toiletries',
      'coffee_maker',
      'refrigerator'
    ]
  }],
  images: [{
    type: String,
    default: 'default-room.jpg'
  }],
  description: {
    type: String,
    required: [true, 'Deskripsi kamar harus diisi']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  },
  quantity: {
    total: {
      type: Number,
      required: true,
      min: 1
    },
    available: {
      type: Number,
      required: true,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Update timestamp sebelum save
RoomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Room', RoomSchema);
