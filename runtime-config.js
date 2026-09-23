/* Public settings only. Never put API keys or payment secrets in this file. */
window.CEO_CONFIG = Object.freeze({
  mode: 'offline', // 'api' after the backend implements docs/openapi.json
  apiBase: '/api/v1', // same origin; reverse proxy a separately hosted backend
  previewEnabled: true, // set false when opening real sales
  timeoutMs: 15000,
  paymentOrigins: [] // exact HTTPS origins approved for the payment provider
});
