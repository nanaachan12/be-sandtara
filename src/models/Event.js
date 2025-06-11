const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  detail: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
