'use strict';

const nearbyController = require('../controllers/nearbyController');
const Joi = require('@hapi/joi');

const routes = [
  // Mendapatkan destinasi/hotel terdekat
  {
    method: 'GET',
    path: '/nearby',
    options: {
      validate: {
        query: Joi.object({
          lokasi: Joi.string().required().description('Koordinat lokasi dalam format latitude,longitude'),
          radius: Joi.number().positive().default(10).description('Radius pencarian dalam kilometer'),
          limit: Joi.number().integer().positive().default(10).description('Jumlah maksimum hasil'),
          type: Joi.string().valid('destinasi', 'hotel').optional().description('Tipe tempat (destinasi atau hotel)')
        })
      }
    },
    handler: nearbyController.getNearbyPlaces
  },
  
  // Mendapatkan fasilitas terdekat (restoran, terminal, dll)
  {
    method: 'GET',
    path: '/nearby/places',
    options: {
      validate: {
        query: Joi.object({
          lokasi: Joi.string().required().description('Koordinat lokasi dalam format latitude,longitude'),
          radius: Joi.number().positive().default(5).description('Radius pencarian dalam kilometer'),
          category: Joi.string().required().description('Kategori tempat (restaurant, atm, hospital, dll)'),
          limit: Joi.number().integer().positive().default(10).description('Jumlah maksimum hasil')
        })
      }
    },
    handler: nearbyController.getNearbyFacilities
  }
];

module.exports = {
  plugin: {
    name: 'nearby-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
