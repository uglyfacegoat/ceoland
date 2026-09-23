const {launch,artifact}=require('./browser-helpers.cjs');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await launch();
 const errors=[],requests=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let access=false,membershipAllowed=false,memberStatus='pending',orderStatus='awaiting_payment',contactAttempts=0;
  let mode='api',previewEnabled=false,serverFail=false,malformed=false;
  const totals={currency:'RUB',items:[{variantId:'ceowallet-white',quantity:1,unitPrice:299000}],subtotal:299000,delivery:50000,total:349000};
  await context.route('**/runtime-config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.CEO_CONFIG=${JSON.stringify({mode,apiBase:'/api/v1',previewEnabled,timeoutMs:1000,paymentOrigins:['https://pay.example.com']})}`}));
  await context.route('**/api/v1/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.replace('/api/v1',''),body=req.postDataJSON();
   const entry={path,method:req.method(),body,headers:req.headers()};requests.push(entry);
   const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(serverFail)return send({error:{code:'INTERNAL_DATABASE_SECRET',message:'SQL PASSWORD'}},500);
   if(malformed)return send({nonsense:true});
   if(req.method()==='POST'){
    assert.equal(req.headers()['x-csrf-token'],'csrf-test');assert(req.headers()['idempotency-key']);
   }
   if(path==='/session')return send({csrfToken:'csrf-test',accessGranted:access,membershipAllowed});
   if(path==='/catalog')return send({currency:'RUB',variants:['white','black'].map(c=>({variantId:'ceowallet-'+c,unitPrice:299000,available:true,maxQuantity:10}))});
   if(path==='/access/check'){
    if(body.code!=='VALID')return send({error:{code:'INVALID_CODE'}},422);
    access=true;return send({accepted:true});
   }
   if(path==='/checkout/quotes')return send({...totals,id:'quote_1',expiresAt:new Date(Date.now()+60000).toISOString()});
   if(path==='/orders'&&req.method()==='POST')return send({...totals,id:'order_1',status:orderStatus},201);
   if(path==='/orders/order_1')return send({...totals,id:'order_1',status:orderStatus});
   if(path==='/orders/order_1/payment')return send({paymentUrl:'https://pay.example.com/checkout'});
   if(path==='/orders/claim')return send({orderId:'order_1'});
   if(path==='/contact-messages'){
    contactAttempts++;
    if(contactAttempts===1)return route.abort('failed');
    if(body.email==='invalid@example.com')return send({error:{code:'VALIDATION_ERROR',fields:{email:'INVALID'},message:'untrusted'}},422);
    return send({id:'contact_1',status:'received'},201);
   }
   if(path==='/purchase-applications')return send({id:'purchase_1',status:'received'},201);
   if(path==='/membership/invitations/claim'){membershipAllowed=true;return send({accepted:true});}
   if(path==='/membership-applications')return send({id:'membership_1',status:'received'},201);
   if(path==='/membership/status')return send({status:memberStatus});
   return send({error:{code:'NOT_FOUND'}},404);
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const go=async(screen,extra='')=>{await page.goto(base+'/app.html?screen='+screen+extra);await page.locator('h1').filter({hasNotText:'ЗАГРУЖАЕМ.'}).waitFor();};
  await go('checkout');assert.match(await page.locator('h1').innerText(),/ПОКА ПУСТО/);
  await go('application');assert.match(await page.locator('h1').innerText(),/НУЖНО ПРИГЛАШЕНИЕ/);
  await go('thank-you');assert(!/ОПЛАЧЕН/.test(await page.locator('main').innerText()));
  await go('screens');assert.equal(await page.locator('.screen-card').count(),0);
  await go('access','&demo=1');assert.equal(await page.locator('.preview-banner').count(),0);
  await page.locator('[name=code]').fill('INVALID');await page.locator('button[type=submit]').click();await page.getByText('Код недействителен, истёк или уже использован.').waitFor();
  await page.locator('[name=code]').fill('VALID');await page.locator('button[type=submit]').click();await page.waitForURL('**screen=cart');
  await page.getByRole('link',{name:'ОФОРМИТЬ ЗАКАЗ'}).click();await page.waitForURL('**screen=checkout');
  await page.locator('[name=name]').fill('Тестовый покупатель');
  for(const [name,value] of Object.entries({email:'test@example.com',phone:'8 (900) 123-45-67',city:'Москва',address:'Тестовая улица, 1'}))await page.locator(`[name="${name}"]`).fill(value);
  for(const name of ['privacy','agreement','purchase-terms'])await page.locator(`[name="${name}"]`).check();
  await page.getByRole('button',{name:'РАССЧИТАТЬ ДОСТАВКУ'}).click();
  await page.getByRole('button',{name:/ПОДТВЕРДИТЬ/}).waitFor();
  assert.match(await page.locator('[data-quote-summary]').innerText(),/500 ₽/);
  assert.equal(requests.filter(r=>r.path==='/orders'&&r.method==='POST').length,0,'quote must not place an order');
  await page.locator('[name=address]').fill('Другой адрес, 2');
  assert.equal(await page.getByRole('button',{name:'РАССЧИТАТЬ ДОСТАВКУ'}).count(),1);
  await page.getByRole('button',{name:'РАССЧИТАТЬ ДОСТАВКУ'}).click();await page.getByRole('button',{name:/ПОДТВЕРДИТЬ/}).click();
  await page.waitForURL('**screen=payment&orderId=order_1');await page.getByRole('button',{name:'ПЕРЕЙТИ К ОПЛАТЕ'}).waitFor();
  assert.equal(await page.locator('.payment-placeholder input').count(),0,'live payment must not collect card details');
  const created=requests.find(r=>r.path==='/orders'&&r.method==='POST');
  assert.equal(created.body.customer.phone,'+79001234567');assert.equal(created.body.customer.address,'Другой адрес, 2');assert.equal(created.body.quoteId,'quote_1');assert(!('total' in created.body));
  const sensitive=await page.evaluate(()=>JSON.stringify({...sessionStorage,...localStorage}));assert(!sensitive.includes('test@example.com'));assert(!sensitive.includes('Тестовый покупатель'));assert(!sensitive.includes('VALID'));
  await context.route('https://pay.example.com/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Provider test page</h1>'}));
  await page.getByRole('button',{name:'ПЕРЕЙТИ К ОПЛАТЕ'}).click();await page.waitForURL('https://pay.example.com/checkout');
  await go('thank-you','&orderId=order_1');assert.match(await page.locator('h1').innerText(),/ОЖИДАЕТ ОПЛАТЫ/,'return URL is not evidence of payment');
  orderStatus='processing';await page.getByRole('button',{name:'ОБНОВИТЬ СТАТУС'}).click();await page.getByRole('heading',{name:'ПРОВЕРЯЕМ ОПЛАТУ.'}).waitFor();assert.equal(await page.getByRole('button',{name:'ПЕРЕЙТИ К ОПЛАТЕ'}).count(),0);
  orderStatus='paid';await page.getByRole('button',{name:'ОБНОВИТЬ СТАТУС'}).click();await page.getByRole('heading',{name:'ОПЛАЧЕН.'}).waitFor();
  await page.screenshot({path:artifact('api-order-paid.png'),fullPage:true});
  await go('contact');
  for(const [name,value] of Object.entries({name:'Тест',email:'invalid@example.com',message:'Тест API'}))await page.locator(`[name=${name}]`).fill(value);
  await page.locator('[name=privacy]').check();await page.locator('button[type=submit]').click();
  await page.getByText('Нет связи с сервером. Проверь подключение и попробуй ещё раз.').waitFor();
  assert.equal(await page.locator('[name=name]').inputValue(),'Тест');
  await page.locator('button[type=submit]').click();await page.locator('#email[aria-invalid=true]').waitFor();
  assert.equal(requests.filter(r=>r.path==='/contact-messages')[0].headers['idempotency-key'],requests.filter(r=>r.path==='/contact-messages')[1].headers['idempotency-key']);
  assert.equal(await page.locator('#email').evaluate(el=>el===document.activeElement),true);
  await page.locator('[name=email]').fill('test@example.com');await page.locator('button[type=submit]').click();await page.waitForURL('**screen=contact-received');
  await go('purchase-application');
  for(const [name,value] of Object.entries({name:'Тест',email:'test@example.com',phone:'+79001234567'}))await page.locator(`[name=${name}]`).fill(value);
  await page.locator('[name=privacy]').check();await page.locator('button[type=submit]').click();await page.waitForURL('**screen=purchase-received');
  await go('application','#invitation=opaque-qr-token');await page.locator('[name=project]').waitFor();assert(!page.url().includes('opaque-qr-token'));
  for(const [name,value] of Object.entries({name:'Тест',email:'test@example.com',phone:'+79001234567',telegram:'@test',project:'Проект'}))await page.locator(`[name=${name}]`).fill(value);
  await page.locator('[name=privacy]').check();await page.locator('button[type=submit]').click();await page.waitForURL('**screen=application-received');
  await go('membership-confirmed');assert(!/ТЫ ВНУТРИ/.test(await page.locator('h1').innerText()));
  memberStatus='approved';await go('membership-confirmed');assert.match(await page.locator('h1').innerText(),/ТЫ ВНУТРИ/);
  await go('order','#order=opaque-order-token');assert(page.url().includes('orderId=order_1'));assert(!page.url().includes('opaque-order-token'));
  for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});await go('order','&orderId=order_1');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  serverFail=true;await go('objects');assert.match(await page.locator('h1').innerText(),/НЕТ СОЕДИНЕНИЯ/);assert(!/SQL PASSWORD/.test(await page.locator('body').innerText()));
  serverFail=false;await page.getByRole('button',{name:'ПОВТОРИТЬ'}).click();await page.getByRole('heading',{name:'OBJECTS.'}).waitFor();
  malformed=true;await go('access');assert.match(await page.locator('[data-form-alert]').innerText(),/прочитать ответ/);malformed=false;
  previewEnabled=true;const before=requests.length;await go('access','&demo=1');await page.locator('.preview-banner').waitFor();assert.equal(requests.length,before,'preview must not call API');
  assert.deepEqual(errors,[]);
  console.log('PASS: API access/session guards, quote confirmation, delivery totals, payment redirect/status, field errors, idempotent retry, forms, QR/order claims, membership, errors, preview isolation, no stored contacts');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
