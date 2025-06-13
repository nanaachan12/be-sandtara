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
  status: {
    type: String,
    enum: ['Kuliner Khas Denpasar', 'Toko Oleh-oleh'],
    default: 'Kuliner Khas Denpasar'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
