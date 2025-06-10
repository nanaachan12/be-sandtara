'use strict';

const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const Joi = require('@hapi/joi');

const routes = [
  // Get all users
  {
    method: 'GET',
    path: '/api/users',
    options: {
      pre: [{ method: auth }],
      handler: userController.getAllUsers
    }
  },

  // Get single user
  {
    method: 'GET',
    path: '/api/users/{id}',
    options: {
      pre: [{ method: auth }],
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID user')
        })
      },
      handler: userController.getUser
    }
  },

  // Update profile
  {
    method: 'PUT',
    path: '/users/profile',
    options: {
      pre: [{ method: auth }],
      validate: {
        payload: Joi.object({
          name: Joi.string().max(50).optional(),
          phoneNumber: Joi.string().optional(),
          preferences: Joi.object().optional()
        })
      },
      handler: userController.updateProfile
    }
  },

  // Create new user
  {
    method: 'POST',
    path: '/api/users',
    options: {
      pre: [{ method: auth }],
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required(),
          role: Joi.string().valid('user', 'admin').default('user'),
          photo: Joi.string().optional(),
          preferences: Joi.object().optional()
        })
      },
      handler: userController.createUser
    }
  },

  // Update user
  {
    method: 'PUT',
    path: '/api/users/{id}',
    options: {
      pre: [{ method: auth }],
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID user')
        }),
        payload: Joi.object({
          name: Joi.string().optional(),
          email: Joi.string().email().optional(),
          password: Joi.string().min(6).optional(),
          role: Joi.string().valid('user', 'admin').optional(),
          photo: Joi.string().optional(),
          preferences: Joi.object().optional(),
          phoneNumber: Joi.string().optional(),
          status: Joi.string().valid('active', 'inactive').optional()
        })
      },
      handler: userController.updateUser
    }
  },

  // Delete user
  {
    method: 'DELETE',
    path: '/api/users/{id}',
    options: {
      pre: [{ method: auth }],
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID user')
        })
      },
      handler: userController.deleteUser
    }
  }
];

module.exports = {
  plugin: {
    name: 'user-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
