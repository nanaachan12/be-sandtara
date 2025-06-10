const mongoose = require('mongoose');
const User = require('./User');
const Destination = require('./Destination');
const Hotel = require('./Hotel');
const Room = require('./Room');
const Event = require('./Event');
const Order = require('./Order');
const Review = require('./Review');

// Register models with lowercase names for consistency
mongoose.model('destination', Destination.schema);
mongoose.model('hotel', Hotel.schema);
mongoose.model('room', Room.schema);
mongoose.model('event', Event.schema);

// Export all models
module.exports = {
  User,
  Destination,
  Hotel,
  Room,
  Event,
  Order,
  Review
}; 