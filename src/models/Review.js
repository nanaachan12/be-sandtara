const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User harus diisi']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order harus diisi']
  },
  itemType: {
    type: String,
    enum: ['hotel', 'destination'],
    required: [true, 'Tipe item harus diisi']
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'itemType',
    required: [true, 'ID item harus diisi']
  },
  rating: {
    type: Number,
    required: [true, 'Rating harus diisi'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, 'Komentar harus diisi'],
    maxlength: 500
  },
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
  }
});

// Prevent user from submitting more than one review per order item
ReviewSchema.index({ user: 1, order: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
