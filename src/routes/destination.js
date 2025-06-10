'use strict';

const destinationController = require('../controllers/destinationController');
const Joi = require('@hapi/joi');

const routes = [
  // Mendapatkan semua destinasi
  {
    method: 'GET',
    path: '/api/wisata',
    handler: destinationController.getAllDestinations
  },

  // Mendapatkan detail destinasi
  {
    method: 'GET',
    path: '/api/wisata/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID destinasi')
        })
      }
    },
    handler: destinationController.getDestinationDetail
  },

  // Menambah destinasi baru
  {
    method: 'POST',
    path: '/api/wisata',
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
          nama: Joi.string().required(),
          kategori: Joi.string().required(),
          harga: Joi.string().required(),
          hariOperasional: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ),
          alamat: Joi.string().required(),
          kodePos: Joi.string().allow(''),
          deskripsi: Joi.string().required(),
          fasilitas: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ),
          gambar: Joi.array().items(Joi.any()).single(),
          jamBuka: Joi.string().allow(''),
          jamTutup: Joi.string().allow(''),
          status: Joi.string().valid('active', 'inactive').default('active'),
          latitude: Joi.number().min(-90).max(90).required().description('Latitude koordinat destinasi'),
          longitude: Joi.number().min(-180).max(180).required().description('Longitude koordinat destinasi')
        })
      }
    },
    handler: destinationController.createDestination
  },

  // Mengupdate destinasi
  {
    method: 'PUT',
    path: '/api/wisata/{id}',
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
          id: Joi.string().required().description('ID destinasi')
        }),
        payload: Joi.object({
          nama: Joi.string().optional(),
          kategori: Joi.string().optional(),
          harga: Joi.alternatives().try(
            Joi.string(),
            Joi.number()
          ).optional(),
          hariOperasional: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ).allow(null, ''),
          alamat: Joi.string().optional(),
          kodePos: Joi.string().allow('', null),
          deskripsi: Joi.string().optional(),
          fasilitas: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ).allow(null, ''),
          gambar: Joi.array().items(Joi.any()).single().allow(null),
          jamBuka: Joi.string().allow('', null),
          jamTutup: Joi.string().allow('', null),
          status: Joi.string().valid('active', 'inactive').default('active'),
          latitude: Joi.number().min(-90).max(90).optional().description('Latitude koordinat destinasi'),
          longitude: Joi.number().min(-180).max(180).optional().description('Longitude koordinat destinasi')
        })
      }
    },
    handler: destinationController.updateDestination
  },

  // Menghapus destinasi
  {
    method: 'DELETE',
    path: '/api/wisata/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID destinasi')
        })
      }
    },
    handler: destinationController.deleteDestination
  },
  
  // Mendapatkan detail hotel
  {
    method: 'GET',
    path: '/hotel/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID hotel')
        })
      }
    },
    handler: destinationController.getHotelDetail
  },
  
  // Mendapatkan semua hotel
  {
    method: 'GET',
    path: '/hotels',
    handler: destinationController.getAllHotels
  },
  
  // Mendapatkan tipe kamar berdasarkan hotel (admin)
  {
    method: 'GET',
    path: '/admin/hotel/{hotelId}/rooms',
    options: {
      validate: {
        params: Joi.object({
          hotelId: Joi.string().required().description('ID hotel')
        })
      }
    },
    handler: destinationController.getRoomsByHotel
  },

  // Menghapus satu foto wisata
  {
    method: 'DELETE',
    path: '/api/wisata/{id}/foto/{fotoIndex}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().required().description('ID destinasi'),
          fotoIndex: Joi.number().integer().min(0).required().description('Index foto yang akan dihapus')
        })
      }
    },
    handler: destinationController.deleteDestinationPhoto
  }
];

module.exports = {
  plugin: {
    name: 'destination-routes',
    version: '1.0.0',
    register: async (server, options) => {
      server.route(routes);
    }
  }
};
