/* Framework-independent HTTP adapter. The server owns access, prices and statuses. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CEO_API = api;
})(globalThis, () => {
  'use strict';
  class ApiError extends Error {
    constructor(code, fields = {}) { super(code); this.name = 'ApiError'; this.code = code; this.fields = fields; }
  }
  const messages = {
    OFFLINE: 'Отправка пока недоступна. Сервис ещё не подключён; данные не отправлены.',
    NETWORK: 'Нет связи с сервером. Проверь подключение и попробуй ещё раз.',
    TIMEOUT: 'Ответ задерживается. Повтори попытку: повторная отправка не создаст дубликат.',
    UNAUTHORIZED: 'Срок доступа истёк. Введи код или открой ссылку из письма снова.',
    FORBIDDEN: 'Для этого действия нужен действующий доступ.',
    INVALID_CODE: 'Код недействителен, истёк или уже использован.',
    INVALID_INVITATION: 'Приглашение недействительно или срок его действия истёк.',
    VALIDATION_ERROR: 'Проверь данные в отмеченных полях.',
    OUT_OF_STOCK: 'Выбранного количества сейчас нет в наличии. Обнови корзину.',
    QUOTE_EXPIRED: 'Расчёт устарел. Рассчитай доставку ещё раз.',
    RATE_LIMITED: 'Слишком много попыток. Подожди немного и попробуй снова.',
    NOT_FOUND: 'Данные не найдены. Проверь ссылку из письма.',
    PAYMENT_UNAVAILABLE: 'Оплата пока недоступна. Попробуй позже.',
    INVALID_RESPONSE: 'Не удалось прочитать ответ сервера. Попробуй позже.',
    SERVER_ERROR: 'Сервис временно недоступен. Попробуй позже.',
    ABORTED: 'Операция прервана.',
    INVALID_PAYMENT_URL: 'Не удалось открыть безопасную страницу оплаты. Свяжись с командой.'
  };
  const message = error => messages[error?.code] || messages.SERVER_ERROR;
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const id = x => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
  const amount = x => Number.isSafeInteger(x) && x >= 0;
  const variants = ['ceowallet-white', 'ceowallet-black'];
  const item = x => object(x) && variants.includes(x.variantId) && Number.isInteger(x.quantity) && x.quantity >= 1 && x.quantity <= 10 && amount(x.unitPrice);
  const totals = x => object(x) && x.currency === 'RUB' && ['subtotal','delivery','total'].every(k => amount(x[k])) && x.subtotal + x.delivery === x.total && Array.isArray(x.items) && x.items.length > 0 && x.items.length <= 2 && x.items.every(item) && new Set(x.items.map(i=>i.variantId)).size === x.items.length && x.items.reduce((sum,i)=>sum+i.quantity*i.unitPrice,0) === x.subtotal;
  const statuses = ['awaiting_payment','processing','paid','shipped','delivered','payment_failed','cancelled'];
  const schemas = {
    session: x => object(x) && typeof x.csrfToken === 'string' && x.csrfToken.length > 0 && typeof x.accessGranted === 'boolean' && typeof x.membershipAllowed === 'boolean',
    catalog: x => object(x) && x.currency === 'RUB' && Array.isArray(x.variants) && x.variants.length === 2 && variants.every(v=>x.variants.some(i=>i.variantId===v)) && x.variants.every(i=>amount(i.unitPrice)&&typeof i.available==='boolean'&&Number.isInteger(i.maxQuantity)&&i.maxQuantity>=0&&i.maxQuantity<=10),
    access: x => object(x) && x.accepted === true,
    receipt: x => object(x) && id(x.id) && x.status === 'received',
    claim: x => object(x) && x.accepted === true,
    orderClaim: x => object(x) && id(x.orderId),
    quote: x => totals(x) && id(x.id) && Number.isFinite(Date.parse(x.expiresAt)),
    order: x => totals(x) && id(x.id) && statuses.includes(x.status) && (x.tracking == null || (object(x.tracking) && typeof x.tracking.carrier === 'string' && typeof x.tracking.number === 'string' && x.tracking.carrier.length <= 200 && x.tracking.number.length <= 200)),
    payment: x => object(x) && typeof x.paymentUrl === 'string',
    membership: x => object(x) && ['not_submitted','pending','approved','rejected'].includes(x.status)
  };
  function createClient(config = {}, fetcher = globalThis.fetch?.bind(globalThis)) {
    const base = config.apiBase || '/api/v1';
    if (!/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(base)) throw new Error('apiBase must be a same-origin path');
    let csrfToken;
    async function request(path, {method = 'GET', body, key, signal, schema} = {}) {
      if (config.mode !== 'api') throw new ApiError('OFFLINE');
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {timedOut = true; controller.abort();}, config.timeoutMs || 15000);
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, {once:true});
      if (signal?.aborted) controller.abort();
      try {
        const headers = {Accept:'application/json'};
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (method !== 'GET') {
          if (!csrfToken) throw new ApiError('UNAUTHORIZED');
          headers['X-CSRF-Token'] = csrfToken;
        }
        if (key) headers['Idempotency-Key'] = key;
        const response = await fetcher(base.replace(/\/$/,'') + path, {method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
        let data;
        try {data = await response.json();} catch {throw new ApiError(response.ok?'INVALID_RESPONSE':'SERVER_ERROR');}
        if (!response.ok) {
          const fallback = {401:'UNAUTHORIZED',403:'FORBIDDEN',404:'NOT_FOUND',409:'OUT_OF_STOCK',422:'VALIDATION_ERROR',429:'RATE_LIMITED'}[response.status] || 'SERVER_ERROR';
          const code = Object.hasOwn(messages,data?.error?.code) ? data.error.code : fallback;
          const fields = object(data?.error?.fields) ? data.error.fields : {};
          throw new ApiError(code, fields);
        }
        if (!schemas[schema]?.(data)) throw new ApiError('INVALID_RESPONSE');
        return data;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (controller.signal.aborted) throw new ApiError(timedOut?'TIMEOUT':'ABORTED');
        throw new ApiError('NETWORK');
      } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
    }
    const get = (path,schema,signal) => request(path,{schema,signal});
    const post = (path,schema,body,key,signal) => request(path,{method:'POST',schema,body,key,signal});
    const orderPath = orderId => {if(!id(orderId))throw new ApiError('NOT_FOUND');return '/orders/'+encodeURIComponent(orderId);};
    return {
      async session(signal) {const data=await get('/session','session',signal);csrfToken=data.csrfToken;return data;},
      catalog: signal => get('/catalog','catalog',signal),
      checkAccess: (body,key,signal) => post('/access/check','access',body,key,signal),
      purchase: (body,key,signal) => post('/purchase-applications','receipt',body,key,signal),
      contact: (body,key,signal) => post('/contact-messages','receipt',body,key,signal),
      membership: (body,key,signal) => post('/membership-applications','receipt',body,key,signal),
      claimInvitation: (token,key,signal) => post('/membership/invitations/claim','claim',{token},key,signal),
      membershipStatus: signal => get('/membership/status','membership',signal),
      claimOrder: (token,key,signal) => post('/orders/claim','orderClaim',{token},key,signal),
      quote: (body,key,signal) => post('/checkout/quotes','quote',body,key,signal),
      createOrder: (body,key,signal) => post('/orders','order',body,key,signal),
      order: (orderId,signal) => get(orderPath(orderId),'order',signal),
      payment: (orderId,key,signal) => post(orderPath(orderId)+'/payment','payment',{},key,signal),
      paymentURL(value) {
        let url;try {url=new URL(value);}catch {throw new ApiError('INVALID_PAYMENT_URL');}
        if(url.protocol!=='https:'||url.username||url.password||!(config.paymentOrigins||[]).includes(url.origin))throw new ApiError('INVALID_PAYMENT_URL');
        return url.href;
      }
    };
  }
  return {createClient,ApiError,message,schemas};
});
