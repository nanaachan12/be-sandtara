const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    province: {
      type: String,
      required: true
    }
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  facilities: [{
    type: String,
    enum: ['parking', 'restaurant', 'swimming_pool', 'gym', 'spa', 'wifi', 'meeting_room', 'laundry']
  }],
  images: [{
    type: String,
    default: 'default-hotel.jpg'
  }],
  checkInTime: {
    type: String,
    default: "14:00"
  },
  checkOutTime: {
    type: String,
    default: "12:00"
  },
  policies: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  contactInfo: {
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    website: String
  }
}, {
  timestamps: true
});

// Index untuk pencarian geografis
hotelSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hotel', hotelSchema);
