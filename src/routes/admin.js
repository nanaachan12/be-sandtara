'use strict';

const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const Joi = require('@hapi/joi');

const routes = [
  // Event routes
  {
    method: 'GET',
    path: '/admin/event',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ]
    },
    handler: eventController.getAllEvents
  },
  {
    method: 'GET',
    path: '/admin/event/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: eventController.getEventById
  },
  {
    method: 'POST',
    path: '/admin/event',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
        multipart: true,
        maxBytes: 20 * 1024 * 1024 // 20MB max file size
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          description: Joi.string().required(),
          category: Joi.string().valid('kuliner khas denpasar', 'toko oleh-oleh').optional(), // Optional category
          images: Joi.any().optional()
        })
      }
    },
    handler: eventController.createEvent
  },
  {
    method: 'PUT',
    path: '/admin/event/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
        multipart: true,
        maxBytes: 20 * 1024 * 1024 // 20MB max file size
      },
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        }),
        payload: Joi.object({
          name: Joi.string().optional(),
          description: Joi.string().optional(),
          category: Joi.string().valid('kuliner khas denpasar', 'toko oleh-oleh').optional(), // Optional category
          images: Joi.any().optional(),
          remainingImages: Joi.string().optional()
        })
      }
    },
    handler: eventController.updateEvent
  },
  {
    method: 'DELETE',
    path: '/admin/event/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: eventController.deleteEvent
  },
  
// Tambah destinasi
  {
    method: 'POST',
    path: '/admin/destinasi',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        parse: true,
        allow: ['multipart/form-data', 'application/json']
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          detail: Joi.string().required(),
          price: Joi.number().required(),
          benefits: Joi.alternatives().try(
            Joi.string().optional(),
            Joi.array().items(Joi.string()).optional()
          ),
          restrictions: Joi.alternatives().try(
            Joi.string().optional(),
            Joi.array().items(Joi.string()).optional()
          ),
          location: Joi.object({
            address: Joi.string().required(),
            city: Joi.string().required(),
            province: Joi.string().required(),
            coordinates: Joi.array().items(Joi.number()).length(2).optional(),
            type: Joi.string().optional()
          }).required(),
          'location.address': Joi.string().optional(),
          'location.city': Joi.string().optional(),
          'location.province': Joi.string().optional(),
          'location.coordinates': Joi.array().items(Joi.number()).length(2).optional(),
          images: Joi.any().optional()
        })
      }
    },
    handler: adminController.addDestination
  },
  
  // Update destinasi
  {
    method: 'PUT',
    path: '/admin/destinasi/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        parse: true,
        allow: ['multipart/form-data', 'application/json']
      },
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        }),
        payload: Joi.object({
          name: Joi.string().optional(),
          detail: Joi.string().optional(),
          price: Joi.number().optional(),
          benefits: Joi.alternatives().try(
            Joi.string().optional(),
            Joi.array().items(Joi.string()).optional()
          ),
          restrictions: Joi.alternatives().try(
            Joi.string().optional(),
            Joi.array().items(Joi.string()).optional()
          ),
          location: Joi.object({
            address: Joi.string().optional(),
            city: Joi.string().optional(),
            province: Joi.string().optional(),
            coordinates: Joi.array().items(Joi.number()).length(2).optional(),
            type: Joi.string().optional()
          }).optional(),
          'location.address': Joi.string().optional(),
          'location.city': Joi.string().optional(),
          'location.province': Joi.string().optional(),
          'location.coordinates': Joi.array().items(Joi.number()).length(2).optional(),
          images: Joi.any().optional()
        })
      }
    },
    handler: adminController.updateDestination
  },
  
  // Hapus destinasi
  {
    method: 'DELETE',
    path: '/admin/destinasi/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: adminController.deleteDestination
  },
  
  // Tambah hotel
  {
    method: 'POST',
    path: '/admin/hotel',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        parse: true,
        allow: ['multipart/form-data', 'application/json']
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          detail: Joi.string().required(),
          price: Joi.number().required(),
          location: Joi.object({
            address: Joi.string().required(),
            city: Joi.string().required(),
            province: Joi.string().required(),
            coordinates: Joi.array().items(Joi.number()).length(2).optional()
          }).required(),
          'location.address': Joi.string().optional(),
          'location.city': Joi.string().optional(),
          'location.province': Joi.string().optional(),
          'location.coordinates': Joi.array().items(Joi.number()).length(2).optional(),
          images: Joi.any().optional()
        })
      }
    },
    handler: adminController.addHotel
  },
  
  // Update hotel
  {
    method: 'PUT',
    path: '/admin/hotel/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        parse: true,
        allow: ['multipart/form-data', 'application/json']
      },
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        }),
        payload: Joi.object({
          name: Joi.string().optional(),
          detail: Joi.string().optional(),
          price: Joi.number().optional(),
          location: Joi.object({
            address: Joi.string().optional(),
            city: Joi.string().optional(),
            province: Joi.string().optional(),
            coordinates: Joi.array().items(Joi.number()).length(2).optional()
          }).optional(),
          'location.address': Joi.string().optional(),
          'location.city': Joi.string().optional(),
          'location.province': Joi.string().optional(),
          'location.coordinates': Joi.array().items(Joi.number()).length(2).optional(),
          images: Joi.any().optional()
        })
      }
    },
    handler: adminController.updateHotel
  },
  
  // Hapus hotel
  {
    method: 'DELETE',
    path: '/admin/hotel/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: adminController.deleteHotel
  },
  
  // Tambah tipe kamar
  {
    method: 'POST',
    path: '/admin/hotel/kamar',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        parse: true,
        allow: ['multipart/form-data', 'application/json']
      },
      validate: {
        payload: Joi.object({
          hotel: Joi.string().required(),
          type: Joi.string().required(),
          price: Joi.number().required(),
          facilities: Joi.string().optional(),
          restrictions: Joi.string().optional(),
          capacity: Joi.number().required(),
          images: Joi.any().optional()
        })
      }
    },
    handler: adminController.addRoom
  },

  // Update tipe kamar
  {
    method: 'PUT',
    path: '/admin/hotel/kamar/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      payload: {
        parse: true,
        allow: ['multipart/form-data', 'application/json']
      },
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        }),
        payload: Joi.object({
          hotel: Joi.string().optional(),
          type: Joi.string().optional(),
          price: Joi.number().optional(),
          facilities: Joi.string().optional(),
          restrictions: Joi.string().optional(),
          capacity: Joi.number().optional(),
          images: Joi.any().optional()
        })
      }
    },
    handler: adminController.updateRoom
  },

  // Hapus tipe kamar
  {
    method: 'DELETE',
    path: '/admin/hotel/kamar/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: adminController.deleteRoom
  },
  
  // Lihat semua user
  {
    method: 'GET',
    path: '/admin/users',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ]
    },
    handler: adminController.getAllUsers
  },
  
  // Hapus user
  {
    method: 'DELETE',
    path: '/admin/users/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: adminController.deleteUser
  },
  
  // Lihat semua order
  {
    method: 'GET',
    path: '/admin/orders',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ]
    },
    handler: adminController.getAllOrders
  },

  // Detail order
  {
    method: 'GET',
    path: '/admin/orders/{id}',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: adminController.getOrderDetail
  },
  
  // Export orderan ke file Excel
  {
    method: 'GET',
    path: '/admin/orders/excel',
    options: {
      pre: [
        { method: auth },
        { method: admin }
      ]
    },
    handler: adminController.exportOrdersToExcel
  }
];

module.exports = {
  plugin: {
    name: 'admin-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};