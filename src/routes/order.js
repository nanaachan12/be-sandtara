'use strict';

const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const Joi = require('@hapi/joi');

const routes = [
  // Booking hotel
  {
    method: 'POST',
    path: '/order/hotel',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        payload: Joi.object({
          hotelId: Joi.string().required(),
          roomId: Joi.string().required(),
          startDate: Joi.date().required(),
          endDate: Joi.date().required(),
          quantity: Joi.number().integer().min(1).required(),
          paymentMethod: Joi.string().valid('transfer', 'credit_card', 'e-wallet').required(),
          notes: Joi.string().optional()
        })
      }
    },
    handler: orderController.bookHotel
  },
  
  // Booking wisata
  {
    method: 'POST',
    path: '/order/wisata',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        payload: Joi.object({
          destinationId: Joi.string().required(),
          visitDate: Joi.date().required(),
          quantity: Joi.number().integer().min(1).required(),
          paymentMethod: Joi.string().valid('transfer', 'credit_card', 'e-wallet').required(),
          notes: Joi.string().optional()
        })
      }
    },
    handler: orderController.bookWisata
  },
  
  // Booking event
  {
    method: 'POST',
    path: '/order/event',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        payload: Joi.object({
          eventId: Joi.string().required(),
          visitDate: Joi.date().required(),
          quantity: Joi.number().integer().min(1).required(),
          paymentMethod: Joi.string().valid('transfer', 'credit_card', 'e-wallet').required(),
          notes: Joi.string().optional()
        })
      }
    },
    handler: orderController.bookEvent
  },
  
  // Lihat semua order milik user
  {
    method: 'GET',
    path: '/order/user',
    options: {
      pre: [
        { method: auth }
      ]
    },
    handler: orderController.getUserOrders
  },
  
  // Detail order
  {
    method: 'GET',
    path: '/order/{id}',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().required()
        })
      }
    },
    handler: orderController.getOrderDetail
  },
  
  // Kirim review hotel/wisata
  {
    method: 'POST',
    path: '/order/review',
    options: {
      pre: [
        { method: auth }
      ],
      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        allow: 'multipart/form-data'
      },
      validate: {
        payload: Joi.object({
          orderId: Joi.string().required(),
          itemId: Joi.string().required(),
          itemType: Joi.string().valid('hotel', 'destination').required(),
          rating: Joi.number().min(1).max(5).required(),
          comment: Joi.string().required().max(500),
          photos: Joi.array().items(Joi.any()).optional()
        })
      }
    },
    handler: orderController.submitReview
  },
  
  // Endpoint callback pembayaran berhasil
  {
    method: 'POST',
    path: '/payment/midtrans-notify',
    handler: orderController.paymentNotification
  },
  
  // Lihat review hotel/wisata
  {
    method: 'GET',
    path: '/reviews/{itemType}/{itemId}',
    options: {
      validate: {
        params: Joi.object({
          itemType: Joi.string().valid('hotel', 'destination').required(),
          itemId: Joi.string().required()
        })
      }
    },
    handler: orderController.getReviews
  },
  
  // Kirim ulang tiket via email
  {
    method: 'GET',
    path: '/ticket/email',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        query: Joi.object({
          orderId: Joi.string().required()
        })
      }
    },
    handler: orderController.resendTicket
  },

  // Cek status pembayaran
  {
    method: 'GET',
    path: '/payment/status/{orderId}',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        params: Joi.object({
          orderId: Joi.string().required()
        })
      }
    },
    handler: orderController.checkPaymentStatus
  },

  // Get payment token for pending order
  {
    method: 'GET',
    path: '/payment/token/{orderId}',
    options: {
      pre: [
        { method: auth }
      ],
      validate: {
        params: Joi.object({
          orderId: Joi.string().required()
        })
      }
    },
    handler: orderController.getPaymentToken
  }
];

module.exports = {
  plugin: {
    name: 'order-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
