'use strict';

const hotelController = require('../controllers/hotelController');
const Joi = require('@hapi/joi');

const routes = [
  // Mendapatkan semua hotel
  {
    method: 'GET',
    path: '/api/hotels',
    handler: hotelController.getAllHotels
  },

  // Mendapatkan detail hotel
  {
    method: 'GET',
    path: '/api/hotels/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID hotel')
        })
      }
    },
    handler: hotelController.getHotelDetail
  },

  // Menambah hotel baru
  {
    method: 'POST',
    path: '/api/hotels',
    options: {
      payload: {
        multipart: true,
        parse: true,
        maxBytes: 50 * 1024 * 1024, // 50MB
        output: 'stream',
        allow: 'multipart/form-data'
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          description: Joi.string().required(),
          address: Joi.string().required(),
          city: Joi.string().required(),
          province: Joi.string().required(),
          coordinates: Joi.string().optional(),
          facilities: Joi.alternatives().try(
            Joi.array().items(Joi.string().valid(
              'parking', 'restaurant', 'swimming_pool', 'gym', 'spa', 'wifi', 'meeting_room', 'laundry'
            )),
            Joi.string()
          ).optional(),
          images: Joi.array().items(Joi.any()).single().optional(),
          checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
          checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
          policies: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string()
          ).optional(),
          status: Joi.string().valid('active', 'inactive', 'maintenance').optional(),
          phone: Joi.string().required(),
          email: Joi.string().email().required(),
          website: Joi.string().uri().optional()
        })
      }
    },
    handler: hotelController.createHotel
  },

  // Mengupdate hotel
  {
    method: 'PUT',
    path: '/api/hotels/{id}',
    options: {
      payload: {
        multipart: true,
        parse: true,
        maxBytes: 50 * 1024 * 1024, // 50MB
        output: 'stream',
        allow: 'multipart/form-data'
      },
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID hotel')
        }),
        payload: Joi.object({
          name: Joi.string().optional(),
          description: Joi.string().optional(),
          address: Joi.string().optional(),
          city: Joi.string().optional(),
          province: Joi.string().optional(),
          coordinates: Joi.string().optional(),
          facilities: Joi.alternatives().try(
            Joi.array().items(Joi.string().valid(
              'parking', 'restaurant', 'swimming_pool', 'gym', 'spa', 'wifi', 'meeting_room', 'laundry'
            )),
            Joi.string()
          ).optional(),
          images: Joi.array().items(Joi.any()).single().optional(),
          checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
          checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
          policies: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string()
          ).optional(),
          status: Joi.string().valid('active', 'inactive', 'maintenance').optional(),
          phone: Joi.string().optional(),
          email: Joi.string().email().optional(),
          website: Joi.string().uri().optional()
        })
      }
    },
    handler: hotelController.updateHotel
  },

  // Menghapus hotel
  {
    method: 'DELETE',
    path: '/api/hotels/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID hotel')
        })
      }
    },
    handler: hotelController.deleteHotel
  },

  // Menghapus satu foto hotel
  {
    method: 'DELETE',
    path: '/api/hotels/{id}/images/{index}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID hotel'),
          index: Joi.number().integer().min(0).required().description('Index gambar yang akan dihapus')
        })
      }
    },
    handler: hotelController.deleteHotelImage
  }
];

module.exports = {
  plugin: {
    name: 'hotel-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
}; 