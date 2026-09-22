const {chromium}=require(process.env.PLAYWRIGHT_MODULE || require('node:path').join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const failures=[],errors=[];
 try{
  const context=await browser.newContext({reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app.html?screen=screens');
  const routes=await page.locator('.screen-card').evaluateAll(els=>els.map(el=>el.href));
  assert.equal(routes.length,31);
  for(const width of [320,375,390,430,700,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const url of routes){
    await page.goto(url);await page.evaluate(()=>document.fonts.ready);
    const state=await page.evaluate(()=>({
     title:document.title,width:innerWidth,scroll:document.documentElement.scrollWidth,
     broken:[...document.images].filter(i=>i.complete&&(!i.naturalWidth||i.naturalWidth===32)).map(i=>i.src),
     heading:document.querySelector('h1')?.textContent,
     overflow:[...document.querySelectorAll('main h1,main h2,main h3,main p,main input,main button')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>e.textContent.slice(0,70))
    }));
    if(state.scroll>width||state.broken.length||state.overflow.length)failures.push({width,screen:new URL(url).searchParams.get('screen'),...state});
    if([390,1440].includes(width)&&['wallet','checkout','access','faq','join','privacy','objects'].includes(new URL(url).searchParams.get('screen'))){
     await page.screenshot({path:`/private/tmp/ceoland-${new URL(url).searchParams.get('screen')}-${width}.png`,fullPage:true});
    }
   }
   await page.goto(base+'/#selection');await page.evaluate(()=>document.fonts.ready);
   const steps=await page.locator('.steps li').evaluateAll(els=>els.map(el=>({text:el.textContent,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,children:[...el.children].map(c=>c.getBoundingClientRect().toJSON())})));
   assert(steps[0].text.includes('анкета по QR'),'missing whitespace in steps');
   for(let i=1;i<steps.length;i++)assert(steps[i].top>=steps[i-1].bottom,'steps overlap');
   if(width===390)await page.locator('.selection').screenshot({path:'/private/tmp/ceoland-selection-fixed.png'});
   console.log(`${width}px: ${routes.length} public screens and landing steps checked`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/#ceowallet');
  assert.equal(await page.locator('.wallet > .text-action').count(),0);
  assert.equal(await page.locator('.wallet > .object-arrows').count(),1);
  await page.locator('input[value=white]').check();
  await page.locator('.wallet h3 a').click();
  assert(new URL(page.url()).searchParams.get('screen')==='wallet-white');
  await page.goto(base+'/app.html?screen=wallet&demo=1');
  await page.getByRole('button',{name:'Ракурс 2'}).click();
  assert((await page.locator('#gallery-main').getAttribute('src')).includes('back'));
  await page.getByRole('link',{name:'КУПИТЬ ПО КОДУ'}).click();
  await page.locator('[name=code]').fill('INVALID');await page.locator('button[type=submit]').click();
  assert.match(await page.locator('[data-form-alert]').innerText(),/недействителен/);
  await page.locator('[name=code]').fill('CEO-DEMO-2026');await page.locator('button[type=submit]').click();
  await page.waitForURL('**screen=cart**');
  await page.getByRole('button',{name:'Увеличить количество'}).click();
  assert.equal(await page.locator('.quantity output').innerText(),'2');
  await page.reload();assert.equal(await page.locator('.quantity output').innerText(),'2');
  await page.getByRole('link',{name:'ОФОРМИТЬ ЗАКАЗ'}).click();
  await page.locator('button[type=submit]').click();
  assert(await page.locator('[aria-invalid=true]').count()>0);
  for(const [name,value] of Object.entries({name:'Тестовый пользователь',email:'test@example.com',phone:'+79001234567',city:'Москва',address:'Тестовая улица, 1'}))await page.locator(`[name="${name}"]`).fill(value);
  for(const name of ['privacy','agreement','purchase-terms'])await page.locator(`[name="${name}"]`).check();
  await page.locator('button[type=submit]').click();await page.waitForURL('**screen=payment**');
  assert.equal(await page.locator('.payment-placeholder input:not([disabled])').count(),0);
  await page.getByRole('button',{name:/ОПЛАТИТЬ/}).click();await page.waitForURL('**screen=processing**');
  await page.getByRole('button',{name:'ОБНОВИТЬ СТАТУС'}).click();await page.waitForURL('**screen=thank-you**');
  await page.goto(base+'/app.html?screen=cart&demo=1');await page.getByRole('button',{name:'УДАЛИТЬ ×'}).click();assert.match(await page.locator('h1').innerText(),/ПОКА ПУСТО/);
  await page.goto(base+'/app.html?screen=contact&demo=1');
  await page.locator('[name=name]').fill('Тест');await page.locator('[name=email]').fill('test@example.com');await page.locator('[name=message]').fill('Проверка интерфейса');await page.locator('[name=privacy]').check();
  await page.locator('button[type=submit]').click();await page.waitForURL('**screen=contact-received**');
  await page.goto(base+'/app.html?screen=access');await page.locator('[name=code]').fill('CEO-DEMO-2026');await page.locator('button[type=submit]').click();assert.match(await page.locator('[data-form-alert]').innerText(),/не отправлены/);
  await page.goto(base+'/app.html?screen=thank-you');assert(!/Покупка подтверждена/.test(await page.locator('main').innerText()));
  await page.goto(base+'/app.html?screen=faq');await page.locator('[data-faq="0"]').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-faq="1"]').getAttribute('aria-selected'),'true');
  console.log('PASS: gallery, product links, invalid/valid code, cart persistence, quantity/removal, checkout validation, payment states, contact form, FAQ keyboard navigation, non-demo guards');
  fs.writeFileSync('/private/tmp/ceoland-site-validation.json',JSON.stringify({screens:routes.length,widths:7,failures,errors},null,2));
  console.log(JSON.stringify({failures,errors},null,2));
  assert.equal(failures.length,0,'responsive layout failures');assert.equal(errors.length,0,'browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
