const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['kuliner khas denpasar', 'toko oleh-oleh'], // Optional categories
    required: false // Not required
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);