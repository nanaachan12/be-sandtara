const axios = require('axios');
const Boom = require('@hapi/boom');
const Hotel = require('../models/Hotel');
const Destination = require('../models/Destination');

// @desc    Get weather forecast for a location
// @route   GET /recommendation/weather
// @access  Public
exports.getWeatherForecast = async (request, h) => {
  try {
    const { city, latitude, longitude, days } = request.query;
    
    // Call the weather forecast API
    const response = await axios.get('https://cuaca-harian-production-816b.up.railway.app/predict/daily');
    
    if (!response.data || response.data.status !== 'success') {
      return Boom.badImplementation('Format respons API cuaca tidak valid');
    }
    
    // Extract relevant data from the API response
    const { current_weather, location, predictions, generated_at, prediction_summary } = response.data;
    
    // Filter predictions based on requested days if specified
    const filteredPredictions = days ? predictions.slice(0, parseInt(days)) : predictions;
    
    // Format the response
    const result = {
      success: true,
      generated_at,
      location,
      current_weather,
      prediction_summary,
      predictions: filteredPredictions.map(pred => ({
        date: pred.date,
        weather_description: pred.weather_description,
        temperature_range: pred.temperature_range,
        temperature_min: pred.temperature_2m_min,
        temperature_max: pred.temperature_2m_max,
        precipitation: pred.precipitation_sum,
        confidence: pred.confidence
      }))
    };
    
    return result;
  } catch (error) {
    console.error('Error getting weather forecast:', error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Get hotel recommendations based on user review
// @route   GET /recommendation/hotel
// @access  Public
exports.getHotelRecommendations = async (request, h) => {
  try {
    const { review } = request.query;
    
    if (!review) {
      return Boom.badRequest('Parameter review diperlukan');
    }
    
    // Call the ML recommendation API
    const response = await axios.get(`https://rekomen-hotel-production.up.railway.app/rekomendasi?review=${encodeURIComponent(review)}`);
    
    if (!response.data || !response.data.rekomendasi || !Array.isArray(response.data.rekomendasi)) {
      return Boom.badImplementation('Format respons API rekomendasi tidak valid');
    }
    
    const recommendations = response.data.rekomendasi;
    
    // Enhance recommendations with hotel data from our database if available
    const enhancedRecommendations = await Promise.all(recommendations.map(async (rec) => {
      // Try to find the hotel in our database by name
      const hotel = await Hotel.findOne({ name: { $regex: rec.Nama_hotel, $options: 'i' } });
      
      return {
        name: rec.Nama_hotel,
        rating: rec.User_Rating,
        // Add hotel details from our database if found
        hotelId: hotel ? hotel._id : null,
        details: hotel ? {
          price: hotel.price,
          images: hotel.images,
          location: hotel.location,
          description: hotel.detail
        } : null
      };
    }));
    
    return {
      success: true,
      count: enhancedRecommendations.length,
      data: enhancedRecommendations
    };
  } catch (error) {
    console.error('Error getting hotel recommendations:', error);
    return Boom.badImplementation('Server Error');
  }
};

// @desc    Get destination recommendations based on query and preferences
// @route   GET /recommendation/destination
// @access  Public
exports.getDestinationRecommendations = async (request, h) => {
  try {
    const { query, preferensi = 'wisata', top_n = 10 } = request.query;
    
    if (!query) {
      return Boom.badRequest('Parameter query diperlukan');
    }
    
    // Call the ML recommendation API for destinations
    const response = await axios.get(`https://project-ml-production.up.railway.app/rekomendasi-wisata?query=${encodeURIComponent(query)}&preferensi=${encodeURIComponent(preferensi)}&top_n=${top_n}`);
    
    // Log the response structure to debug
    console.log('Destination API response structure:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    
    // Check if response.data.hasil exists and is an array
    if (!response.data || !response.data.hasil || !Array.isArray(response.data.hasil)) {
      return Boom.badImplementation('Format respons API rekomendasi destinasi tidak valid');
    }
    
    const recommendations = response.data.hasil;
    
    // Enhance recommendations with destination data from our database if available
    const enhancedRecommendations = await Promise.all(recommendations.map(async (rec) => {
      // Try to find the destination in our database by name
      const destination = await Destination.findOne({ name: { $regex: rec.Nama_Destinasi, $options: 'i' } });
      
      return {
        name: rec.Nama_Destinasi,
        rating: rec.Rating,
        category: rec.Kategori,
        description: rec.Deskripsi_Singkat,
        location: {
          address: rec.Lokasi,
          coordinates: [rec.Longitude, rec.Latitude]
        },
        reviewCount: rec.Jumlah_Ulasan,
        reviews: [
          rec.Ulasan_1,
          rec.Ulasan_2,
          rec.Ulasan_3,
          rec.Ulasan_4
        ].filter(Boolean), // Remove any undefined or empty reviews
        // Add destination details from our database if found
        destinationId: destination ? destination._id : null,
        details: destination ? {
          price: destination.price,
          images: destination.images,
          benefits: destination.benefits,
          restrictions: destination.restrictions
        } : null
      };
    }));
    
    return {
      success: true,
      count: enhancedRecommendations.length,
      data: enhancedRecommendations
    };
  } catch (error) {
    console.error('Error getting destination recommendations:', error);
    return Boom.badImplementation('Server Error');
  }
};
