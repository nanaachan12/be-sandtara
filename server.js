'use strict';

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const connectDB = require('./src/config/database');
require('dotenv').config();
const path = require('path');

// Import routes
const routes = require('./src/routes');
const hotelRoutes = require('./src/routes/hotel');

// Import and initialize models
require('./src/models');

const init = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connected successfully');

    const server = Hapi.server({
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0',
      routes: {
        cors: {
          origin: ['*'],
          credentials: true,
          headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'Accept-language', 'Origin', 'X-Requested-With'],
          exposedHeaders: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'Accept-language'],
          additionalExposedHeaders: ['X-Requested-With'],
          maxAge: 86400,
          additionalHeaders: ['X-Requested-With']
        },
        files: {
          relativeTo: path.join(__dirname, '.')
        }
      }
    });

    // Register plugins
    await server.register(Inert);

    // Register routes plugin
    await server.register([routes, hotelRoutes]);

    // Serve static files from uploads directory
    server.route({
      method: 'GET',
      path: '/uploads/{param*}',
      handler: {
        directory: {
          path: 'uploads',
          listing: false,
          index: false
        }
      }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
