'use strict';

const Hapi = require('@hapi/hapi');
require('dotenv').config();

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        routes: {
            cors: {
                origin: ['http://localhost:5173', 'http://localhost:3000'],
                headers: [
                    'Accept',
                    'Authorization',
                    'Content-Type',
                    'If-None-Match',
                    'Accept-language',
                    'Origin',
                    'X-Requested-With'
                ],
                additionalHeaders: ['X-Requested-With'],
                credentials: true,
                maxAge: 86400
            }
        }
    });

    // Register routes
    await server.register([
        require('./routes')
    ]);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
