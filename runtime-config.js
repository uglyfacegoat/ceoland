window.CEO_CONFIG = Object.freeze({
  mode: 'offline', // 'api' after the backend implements docs/openapi.json
  apiBase: '/api/v1', // same origin; reverse proxy a separately hosted backend
  deliveryProvider: 'fixed', // 'cdek' enables pickup-point delivery (needs the backend CDEK endpoints)
  previewEnabled: false, // true только для визуального ревью
  timeoutMs: 15000,
  paymentOrigins: [
    'https://securepay.tinkoff.ru',
    'https://securepayments.tinkoff.ru',
    'https://pay.tbank-online.com'
  ] 
});
