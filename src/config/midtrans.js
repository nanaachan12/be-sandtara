const midtransClient = require('midtrans-client');
require('dotenv').config();

// Konfigurasi Midtrans - menggunakan nilai hardcoded untuk sandbox testing
// dan fallback ke environment variables jika tersedia
const MIDTRANS_SERVER_KEY = 'SB-Mid-server-Qd-lrZHszKChYQooh7hMmWKE';
const MIDTRANS_CLIENT_KEY = 'SB-Mid-client-Yl84Wtks7y4YYygd';
const MIDTRANS_MERCHANT_ID = 'G940335566';
const IS_PRODUCTION = false; // Selalu gunakan sandbox untuk testing

console.log('Midtrans Configuration Loaded:', {
  serverKey: MIDTRANS_SERVER_KEY ? MIDTRANS_SERVER_KEY.substring(0, 10) + '...' : 'Not Set',
  clientKey: MIDTRANS_CLIENT_KEY ? MIDTRANS_CLIENT_KEY.substring(0, 10) + '...' : 'Not Set',
  merchantId: MIDTRANS_MERCHANT_ID,
  isProduction: IS_PRODUCTION
});

// Inisialisasi Core API instance
const coreApi = new midtransClient.CoreApi({
  isProduction: IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY
});

// Inisialisasi Snap API instance
const snap = new midtransClient.Snap({
  isProduction: IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY
});

module.exports = {
  coreApi,
  snap,
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_SERVER_KEY,
  MIDTRANS_MERCHANT_ID
};
