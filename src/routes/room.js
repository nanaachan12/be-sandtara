'use strict';

const roomController = require('../controllers/roomController');
const Joi = require('@hapi/joi');

const routes = [
  // Mendapatkan semua kamar
  {
    method: 'GET',
    path: '/api/rooms',
    handler: roomController.getAllRooms
  },

  // Mendapatkan detail kamar
  {
    method: 'GET',
    path: '/api/rooms/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID kamar')
        })
      }
    },
    handler: roomController.getRoomDetail
  },

  // Menambah kamar baru
  {
    method: 'POST',
    path: '/api/rooms',
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
          roomNumber: Joi.string().required(),
          hotel: Joi.string().required(),
          type: Joi.string().valid('standard', 'superior', 'deluxe', 'suite', 'family', 'executive').required(),
          price: Joi.number().required(),
          adults: Joi.number().integer().min(1).required(),
          children: Joi.number().integer().min(0).default(0),
          bedType: Joi.string().valid('single', 'twin', 'double', 'queen', 'king').required(),
          size: Joi.number().required(),
          amenities: Joi.alternatives().try(
            Joi.array().items(Joi.string().valid(
              'ac', 'tv', 'wifi', 'minibar', 'safe', 'desk', 'shower', 
              'hairdryer', 'toiletries', 'coffee_maker', 'refrigerator'
            )),
            Joi.string()
          ),
          images: Joi.array().items(Joi.any()).single(),
          description: Joi.string().required(),
          status: Joi.string().valid('available', 'occupied', 'maintenance').default('available'),
          totalQuantity: Joi.number().integer().min(1).required()
        }).options({ stripUnknown: true })
      }
    },
    handler: roomController.createRoom
  },

  // Mengupdate kamar
  {
    method: 'PUT',
    path: '/api/rooms/{id}',
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
          id: Joi.string().required().description('ID kamar')
        }),
        payload: Joi.object({
          name: Joi.string().optional(),
          roomNumber: Joi.string().optional(),
          hotel: Joi.string().optional(),
          type: Joi.string().valid('standard', 'superior', 'deluxe', 'suite', 'family', 'executive').optional(),
          price: Joi.number().optional(),
          adults: Joi.number().integer().min(1).optional(),
          children: Joi.number().integer().min(0).optional(),
          bedType: Joi.string().valid('single', 'twin', 'double', 'queen', 'king').optional(),
          size: Joi.number().optional(),
          amenities: Joi.alternatives().try(
            Joi.array().items(Joi.string().valid(
              'ac', 'tv', 'wifi', 'minibar', 'safe', 'desk', 'shower', 
              'hairdryer', 'toiletries', 'coffee_maker', 'refrigerator'
            )),
            Joi.string()
          ).optional(),
          images: Joi.array().items(Joi.any()).single().optional(),
          description: Joi.string().optional(),
          status: Joi.string().valid('available', 'occupied', 'maintenance').optional(),
          totalQuantity: Joi.number().integer().min(1).optional()
        }).options({ stripUnknown: true })
      }
    },
    handler: roomController.updateRoom
  },

  // Menghapus kamar
  {
    method: 'DELETE',
    path: '/api/rooms/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID kamar')
        })
      }
    },
    handler: roomController.deleteRoom
  },

  // Menghapus satu foto kamar
  {
    method: 'DELETE',
    path: '/api/rooms/{id}/images/{index}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID kamar'),
          index: Joi.number().integer().min(0).required().description('Index gambar yang akan dihapus')
        })
      }
    },
    handler: roomController.deleteRoomImage
  }
];

module.exports = {
  plugin: {
    name: 'room-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
}; 