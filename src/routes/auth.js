'use strict';

const authController = require('../controllers/authController');
const Joi = require('@hapi/joi');

const routes = [
  {
    method: 'POST',
    path: '/auth/register',
    options: {
      validate: {
        payload: Joi.object({
          name: Joi.string().required().max(50),
          email: Joi.string().required().email(),
          password: Joi.string().required().min(6),
          role: Joi.string().valid('user', 'admin')
        })
      }
    },
    handler: authController.register
  },
  {
    method: 'POST',
    path: '/auth/verify-email',
    options: {
      validate: {
        payload: Joi.object({
          email: Joi.string().required().email(),
          code: Joi.string().required().length(6)
        })
      }
    },
    handler: authController.verifyEmail
  },
  {
    method: 'POST',
    path: '/auth/resend-verification',
    options: {
      validate: {
        payload: Joi.object({
          email: Joi.string().required().email()
        })
      }
    },
    handler: authController.resendVerification
  },
  {
    method: 'POST',
    path: '/auth/login',
    options: {
      validate: {
        payload: Joi.object({
          email: Joi.string().required().email(),
          password: Joi.string().required()
        })
      }
    },
    handler: authController.login
  },
  {
    method: 'POST',
    path: '/auth/forgot-password',
    options: {
      validate: {
        payload: Joi.object({
          email: Joi.string().required().email()
        })
      }
    },
    handler: authController.forgotPassword
  },
  {
    method: 'POST',
    path: '/auth/reset-password',
    options: {
      validate: {
        payload: Joi.object({
          email: Joi.string().required().email(),
          code: Joi.string().required().length(6),
          password: Joi.string().required().min(6)
        })
      }
    },
    handler: authController.resetPassword
  }
];

module.exports = {
  plugin: {
    name: 'auth-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
