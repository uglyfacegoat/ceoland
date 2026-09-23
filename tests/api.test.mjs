import test from 'node:test';
import assert from 'node:assert/strict';
import API from '../integration/api.js';
import store from '../integration/store.js';
const config={mode:'api',apiBase:'/api/v1',paymentOrigins:['https://pay.example.com']};
const session={csrfToken:'csrf-test',accessGranted:false,membershipAllowed:false};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('offline does not send requests; mutation requires a server session',async()=>{
  let calls=0;const fetcher=async()=>{calls++;return json(session);};
  await assert.rejects(API.createClient({},fetcher).session(),{code:'OFFLINE'});
  await assert.rejects(API.createClient(config,fetcher).checkAccess({code:'x'},'key'),{code:'UNAUTHORIZED'});
  assert.equal(calls,0);
});
test('HTTP contract: session cookie, CSRF, idempotency and no implicit redirects',async()=>{
  const calls=[];const client=API.createClient(config,async(url,options)=>{calls.push({url,...options});return json(url.endsWith('session')?session:{accepted:true});});
  await client.session();await client.checkAccess({code:'TEST',variantId:'ceowallet-white'},'stable-key');
  assert.equal(calls[1].url,'/api/v1/access/check');assert.equal(calls[1].credentials,'same-origin');assert.equal(calls[1].cache,'no-store');assert.equal(calls[1].redirect,'error');
  assert.equal(calls[1].headers['X-CSRF-Token'],'csrf-test');assert.equal(calls[1].headers['Idempotency-Key'],'stable-key');
  assert.deepEqual(JSON.parse(calls[1].body),{code:'TEST',variantId:'ceowallet-white'});
});
test('rejects malformed success, arbitrary errors, wrong totals and unsafe payment origins',async()=>{
  await assert.rejects(API.createClient(config,async()=>json({csrfToken:'x'})).session(),{code:'INVALID_RESPONSE'});
  await assert.rejects(API.createClient(config,async()=>json({error:{code:'raw-secret-error',message:'stack and SQL'}},500)).session(),e=>API.message(e)==='Сервис временно недоступен. Попробуй позже.');
  assert.equal(API.schemas.order({id:'id',status:'paid',items:[{variantId:'ceowallet-white',quantity:1,unitPrice:299000}],currency:'RUB',subtotal:299000,delivery:100,total:1}),false);
  const client=API.createClient(config);
  for(const url of ['javascript:alert(1)','https://evil.example','https://pay.example.com.evil.test/','http://pay.example.com','https://user:pass@pay.example.com/'])assert.throws(()=>client.paymentURL(url),{code:'INVALID_PAYMENT_URL'});
  assert.equal(client.paymentURL('https://pay.example.com/order'),'https://pay.example.com/order');
});
test('timeout and navigation cancellation are distinct and do not retry mutations',async()=>{
  let calls=0;const fetcher=(url,{signal})=>new Promise((resolve,reject)=>{calls++;if(signal.aborted)return reject(new Error('abort'));signal.addEventListener('abort',()=>reject(new Error('abort')),{once:true});});
  await assert.rejects(API.createClient({...config,timeoutMs:5},fetcher).session(),{code:'TIMEOUT'});
  const abort=new AbortController();abort.abort();
  await assert.rejects(API.createClient(config,fetcher).session(abort.signal),{code:'ABORTED'});assert.equal(calls,2);
});
test('storage is bounded and tolerates corruption and browser restrictions',()=>{
  assert.deepEqual(store.cart([{colour:'white',quantity:999},{colour:'white',quantity:2},{colour:'black',quantity:-2},{colour:'evil',quantity:1}]),[{colour:'white',quantity:10}]);
  assert.deepEqual(store.cart({}),[]);assert.deepEqual(store.items([{colour:'black',quantity:2}]),[{variantId:'ceowallet-black',quantity:2}]);
  assert.deepEqual(store.read({getItem(){return '{';}},'cart',[]),[]);assert.equal(store.write({setItem(){throw Error();}},'key',{}),false);
  assert.equal(store.phone('8 (900) 123-45-67'),'+79001234567');
});
test('field errors expose only named validation codes and amounts use kopecks',async()=>{
  const client=API.createClient(config,async url=>url.endsWith('/session')?json(session):json({error:{code:'VALIDATION_ERROR',fields:{email:'INVALID'}}},422));
  await client.session();await assert.rejects(client.contact({},'key'),e=>e.code==='VALIDATION_ERROR'&&e.fields.email==='INVALID');
  const order={id:'order_1',status:'paid',items:[{variantId:'ceowallet-white',quantity:2,unitPrice:299000}],currency:'RUB',subtotal:598000,delivery:50000,total:648000};
  assert(API.schemas.order(order));assert(!API.schemas.order({...order,items:[...order.items,...order.items]}));assert(!API.schemas.order({...order,total:NaN}));assert(!API.schemas.order({...order,tracking:{carrier:'ok',number:123}}));
});
