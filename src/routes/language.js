'use strict';

const languageController = require('../controllers/languageController');
const Joi = require('@hapi/joi');

const routes = [
  // Mendapatkan daftar bahasa yang tersedia
  {
    method: 'GET',
    path: '/lang',
    options: {
      validate: {
        query: Joi.object({
          active_only: Joi.string().valid('true', 'false').default('true').description('Filter hanya bahasa yang aktif')
        })
      }
    },
    handler: languageController.getAvailableLanguages
  },
  
  // Mendapatkan bahasa default
  {
    method: 'GET',
    path: '/lang/default',
    handler: languageController.getDefaultLanguage
  },
  
  // Mendapatkan detail bahasa berdasarkan kode bahasa
  {
    method: 'GET',
    path: '/lang/{code}',
    options: {
      validate: {
        params: Joi.object({
          code: Joi.string().required().description('Kode bahasa (id, en, dll)')
        })
      }
    },
    handler: languageController.getLanguageByCode
  }
];

module.exports = {
  plugin: {
    name: 'language-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
