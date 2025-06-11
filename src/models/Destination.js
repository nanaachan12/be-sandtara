const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: [true, 'Nama destinasi harus diisi'],
    trim: true
  },
  kategori: {
    type: String,
    required: [true, 'Kategori harus diisi'],
    enum: ['alam', 'budaya', 'religi', 'kuliner', 'hiburan']
  },
  cuaca: {
    type: String,
    enum: ['panas', 'dingin']
  },
  harga: {
    type: Number,
    required: [true, 'Harga harus diisi']
  },
  hariOperasional: [{
    type: String,
    enum: ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']
  }],
  alamat: {
    type: String,
    required: [true, 'Alamat harus diisi']
  },
  kodePos: {
    type: String
  },
  deskripsi: {
    type: String,
    required: [true, 'Deskripsi harus diisi']
  },
  fasilitas: [{
    type: String
  }],
  gambar: [{
    type: String
  }],
  jamBuka: {
    type: String
  },
  jamTutup: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude harus diisi']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude harus diisi']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  }
}, {
  timestamps: true
});

// Index untuk pencarian geografis
destinationSchema.index({ location: '2dsphere' });

// Middleware untuk mengisi koordinat location dari latitude dan longitude
destinationSchema.pre('save', function(next) {
  if (this.latitude && this.longitude) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude] // GeoJSON menggunakan format [longitude, latitude]
    };
  }
  next();
});

module.exports = mongoose.model('Destination', destinationSchema);
