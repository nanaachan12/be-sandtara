'use strict';

const recommendationController = require('../controllers/recommendationController');
const Joi = require('@hapi/joi');

const routes = [
  // Get hotel recommendations based on review
  {
    method: 'GET',
    path: '/recommendation/hotel',
    options: {
      validate: {
        query: Joi.object({
          review: Joi.string().required().description('Review text for recommendation')
        })
      }
    },
    handler: recommendationController.getHotelRecommendations
  },
  
  // Get destination recommendations based on query and preferences
  {
    method: 'GET',
    path: '/recommendation/destination',
    options: {
      validate: {
        query: Joi.object({
          query: Joi.string().required().description('Query text for destination recommendation'),
          preferensi: Joi.string().default('wisata').description('Preference type (default: wisata)'),
          top_n: Joi.number().integer().min(1).max(50).default(10).description('Number of recommendations to return')
        })
      }
    },
    handler: recommendationController.getDestinationRecommendations
  },
  
  // Get weather forecast
  {
    method: 'GET',
    path: '/recommendation/weather',
    options: {
      validate: {
        query: Joi.object({
          city: Joi.string().description('City name for weather forecast'),
          latitude: Joi.number().description('Latitude coordinate'),
          longitude: Joi.number().description('Longitude coordinate'),
          days: Joi.number().integer().min(1).max(30).description('Number of days to forecast')
        })
      }
    },
    handler: recommendationController.getWeatherForecast
  }
];

module.exports = {
  plugin: {
    name: 'recommendation-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
