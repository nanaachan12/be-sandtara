const Boom = require('@hapi/boom');
const Destination = require('../models/Destination');
const Hotel = require('../models/Hotel');

// Fungsi untuk menghitung jarak antara dua titik koordinat (dalam kilometer)
// Menggunakan rumus Haversine
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Jarak dalam kilometer
  return distance;
};

// @desc    Mendapatkan tempat terdekat (destinasi/hotel) dari lokasi tertentu
// @route   GET /nearby
// @access  Public
exports.getNearbyPlaces = async (request, h) => {
  try {
    const { lokasi, radius = 10, limit = 10, type } = request.query;
    
    // Validasi parameter lokasi
    if (!lokasi) {
      return Boom.badRequest('Parameter lokasi diperlukan (format: latitude,longitude)');
    }
    
    // Parse koordinat dari parameter lokasi
    const [latitude, longitude] = lokasi.split(',').map(coord => parseFloat(coord.trim()));
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return Boom.badRequest('Format lokasi tidak valid. Gunakan format: latitude,longitude');
    }
    
    // Validasi radius
    const searchRadius = parseFloat(radius);
    if (isNaN(searchRadius) || searchRadius <= 0) {
      return Boom.badRequest('Radius harus berupa angka positif');
    }
    
    // Validasi limit
    const resultLimit = parseInt(limit);
    if (isNaN(resultLimit) || resultLimit <= 0) {
      return Boom.badRequest('Limit harus berupa angka positif');
    }
    
    // Query untuk mencari tempat terdekat menggunakan GeoJSON
    const geoNearQuery = {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        distanceField: "distance",
        maxDistance: searchRadius * 1000, // Konversi ke meter
        spherical: true,
        query: {}
      }
    };
    
    let results = [];
    
    // Jika tipe spesifik diminta, cari hanya tipe tersebut
    if (type === 'destinasi') {
      const destinations = await Destination.aggregate([
        geoNearQuery,
        { $limit: resultLimit },
        { 
          $project: { 
            _id: 1,
            name: 1,
            detail: 1,
            price: 1,
            images: 1,
            location: 1,
            distance: 1,
            type: { $literal: "destinasi" }
          } 
        }
      ]);
      
      results = destinations;
    } else if (type === 'hotel') {
      const hotels = await Hotel.aggregate([
        geoNearQuery,
        { $limit: resultLimit },
        { 
          $project: { 
            _id: 1,
            name: 1,
            detail: 1,
            price: 1,
            images: 1,
            location: 1,
            distance: 1,
            type: { $literal: "hotel" }
          } 
        }
      ]);
      
      results = hotels;
    } else {
      // Jika tidak ada tipe spesifik, cari keduanya dan gabungkan hasilnya
      const destinations = await Destination.aggregate([
        geoNearQuery,
        { 
          $project: { 
            _id: 1,
            name: 1,
            detail: 1,
            price: 1,
            images: 1,
            location: 1,
            distance: 1,
            type: { $literal: "destinasi" }
          } 
        }
      ]);
      
      const hotels = await Hotel.aggregate([
        geoNearQuery,
        { 
          $project: { 
            _id: 1,
            name: 1,
            detail: 1,
            price: 1,
            images: 1,
            location: 1,
            distance: 1,
            type: { $literal: "hotel" }
          } 
        }
      ]);
      
      // Gabungkan hasil dan urutkan berdasarkan jarak
      results = [...destinations, ...hotels]
        .sort((a, b) => a.distance - b.distance)
        .slice(0, resultLimit);
    }
    
    // Konversi jarak dari meter ke kilometer
    results = results.map(place => ({
      ...place,
      distance: parseFloat((place.distance / 1000).toFixed(2)) // Konversi ke km dengan 2 desimal
    }));
    
    return {
      success: true,
      count: results.length,
      data: results
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Mendapatkan tempat terdekat dengan kategori tambahan (restoran, terminal, dll)
// @route   GET /nearby/places
// @access  Public
exports.getNearbyFacilities = async (request, h) => {
  try {
    const { lokasi, radius = 5, category, limit = 10 } = request.query;
    
    // Validasi parameter lokasi
    if (!lokasi) {
      return Boom.badRequest('Parameter lokasi diperlukan (format: latitude,longitude)');
    }
    
    // Validasi parameter kategori
    if (!category) {
      return Boom.badRequest('Parameter kategori diperlukan (contoh: restaurant, atm, hospital)');
    }
    
    // Parse koordinat dari parameter lokasi
    const [latitude, longitude] = lokasi.split(',').map(coord => parseFloat(coord.trim()));
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return Boom.badRequest('Format lokasi tidak valid. Gunakan format: latitude,longitude');
    }
    
    // Validasi radius
    const searchRadius = parseFloat(radius);
    if (isNaN(searchRadius) || searchRadius <= 0) {
      return Boom.badRequest('Radius harus berupa angka positif');
    }
    
    // Validasi limit
    const resultLimit = parseInt(limit);
    if (isNaN(resultLimit) || resultLimit <= 0) {
      return Boom.badRequest('Limit harus berupa angka positif');
    }
    
    // Catatan: Implementasi ini memerlukan integrasi dengan API pihak ketiga
    // seperti Google Places API atau OpenStreetMap API untuk mendapatkan
    // data fasilitas terdekat seperti restoran, ATM, dll.
    
    // Contoh respons (untuk tujuan demonstrasi)
    // Dalam implementasi nyata, ini akan diganti dengan panggilan ke API eksternal
    const mockPlaces = [
      {
        id: 'place1',
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Terdekat 1`,
        address: 'Jl. Contoh No. 1, Kota',
        distance: calculateDistance(latitude, longitude, latitude + 0.001, longitude + 0.001),
        category: category,
        rating: 4.5
      },
      {
        id: 'place2',
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Terdekat 2`,
        address: 'Jl. Contoh No. 2, Kota',
        distance: calculateDistance(latitude, longitude, latitude + 0.002, longitude + 0.002),
        category: category,
        rating: 4.2
      },
      {
        id: 'place3',
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Terdekat 3`,
        address: 'Jl. Contoh No. 3, Kota',
        distance: calculateDistance(latitude, longitude, latitude + 0.003, longitude - 0.001),
        category: category,
        rating: 4.0
      }
    ];
    
    // Urutkan berdasarkan jarak dan batasi jumlah hasil
    const results = mockPlaces
      .sort((a, b) => a.distance - b.distance)
      .slice(0, resultLimit);
    
    return {
      success: true,
      count: results.length,
      data: results,
      note: "Catatan: Data ini adalah contoh. Implementasi sebenarnya memerlukan integrasi dengan API pihak ketiga."
    };
  } catch (error) {
    console.error(error);
    return Boom.badImplementation('Server Error');
  }
};
