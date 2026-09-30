const {launch,artifact}=require('./browser-helpers.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await launch();
 const failures=[],errors=[];
 try{
  const context=await browser.newContext({reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app.html?screen=screens');
  const routes=await page.locator('.screen-card').evaluateAll(els=>els.map(el=>el.href));
  assert.equal(routes.length,24);
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
    if([390,1440].includes(width)&&['wallet','wallet-white','checkout','access','faq','join','privacy','objects'].includes(new URL(url).searchParams.get('screen'))){
     await page.screenshot({path:artifact(`ceoland-${new URL(url).searchParams.get('screen')}-${width}.png`),fullPage:true});
    }
   }
   await page.goto(base+'/#selection');await page.evaluate(()=>document.fonts.ready);
   const steps=await page.locator('.steps li').evaluateAll(els=>els.map(el=>({text:el.textContent,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,children:[...el.children].map(c=>c.getBoundingClientRect().toJSON())})));
   assert.equal(steps.length,5,'five application stages');
   assert(steps[0].text.includes('ЗАЯВКА НА ПОКУПКУ'));
   assert(steps[2].text.includes('ЗАЯВКА В КЛУБ'));
   assert(steps[4].text.includes('РЕШЕНИЕ'));
   for(let i=1;i<steps.length;i++)assert(steps[i].top>=steps[i-1].bottom,'steps overlap');
   if([390,1440].includes(width)){await page.locator('.selection').screenshot({path:artifact(`ceoland-five-steps-${width}.png`)});await page.locator('.membership').screenshot({path:artifact(`ceoland-ticket-${width}.png`)});}
   for(const name of ['mark','code']){
    const sculpture=page.locator(`.selection-${name}`);
    if(width<=700)assert.equal(await sculpture.isVisible(),false,`${name} must be hidden on mobile`);
    else{
     const clear=await sculpture.evaluate(el=>{
      const obstacles=[...document.querySelectorAll('.steps li,.selection>.section-heading')].map(e=>e.getBoundingClientRect());
      const r=el.getBoundingClientRect();
      const leftFits=el.classList.contains('selection-mark')?r.left<0&&r.right>0:r.left>=0;
      return r.width>0&&leftFits&&r.right<=innerWidth&&obstacles.every(o=>r.right<=o.left||r.left>=o.right||r.bottom<=o.top||r.top>=o.bottom);
     });
     assert(clear,`${name} overlaps the route at ${width}`);
    }
   }
   assert.equal(await page.locator('.membership-card').count(),0);
   assert.equal(await page.locator('.ticket-art').count(),0);
   assert.equal(await page.locator('.membership-note h2').innerText(),'ЧЛЕНСТВО —\nПО РЕШЕНИЮ\nКОМАНДЫ.');
   if(width<=700){
    const gap=await page.evaluate(()=>document.querySelector('.colours').getBoundingClientRect().top-document.querySelector('.product-image').getBoundingClientRect().bottom);
    assert(gap>=0,`product photo overlaps colour controls at ${width}`);
   }
   await page.goto(base+'/#top');
   await page.locator('.landing-menu').click();
   await page.waitForURL('**screen=menu');
   await page.goto(base+'/app.html?screen=contact');
   await page.locator('[name=name]').click();
   assert.equal(await page.locator('#name-error').evaluate(el=>getComputedStyle(el).outlineStyle),'none','input focus outlines an error panel');
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('#email-error').evaluate(el=>getComputedStyle(el).outlineStyle),'none','keyboard focus outlines an error panel');
   console.log(`${width}px: ${routes.length} public screens and landing steps checked`);
  }
  // Documents use the same type scale, beside destinations on desktop and below on mobile.
  for(const [width,height] of [[320,568],[390,844],[768,600],[1440,900]]){
   await page.setViewportSize({width,height});
   await page.goto(base+'/app.html?screen=menu');await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.site-header nav').count(),0,'menu duplicates the header navigation');
   assert.equal(await page.locator('footer').count(),0,'menu must not repeat the footer');
   const menuLayout=await page.evaluate(()=>{
    const main=document.querySelector('.menu-links').getBoundingClientRect();
    const docs=[...document.querySelectorAll('.menu-documents a')].map(e=>e.getBoundingClientRect().toJSON());
    return {main:main.toJSON(),docs};
   });
   if(width<=700){
    assert(menuLayout.docs[0].top>=menuLayout.main.bottom,'documents must follow the primary links on mobile');
    menuLayout.docs.slice(1).forEach((r,i)=>assert(r.top>=menuLayout.docs[i].bottom,'mobile documents must form one vertical list'));
   }else assert(menuLayout.docs[0].left>=menuLayout.main.right,'documents must sit to the right on desktop');
   const menuLinks=await page.locator('.menu-links a,.menu-documents a').evaluateAll(els=>els.map(el=>({url:el.href,bottom:el.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right,font:getComputedStyle(el).fontSize})));
   assert.equal(menuLinks.length,9);
   for(const item of menuLinks){
    assert(!new URL(item.url).hash,'menu must link to a page, not a landing section');
    assert(item.right<=width,'menu must fit the viewport width');
    assert.equal(item.font,menuLinks[0].font,'documents must match the main menu type size');
    if(width>700)assert(item.bottom<=height,'desktop menu must fit the viewport height');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'menu has horizontal overflow');
   await page.locator('.menu-documents a').last().scrollIntoViewIfNeeded();
   assert(await page.locator('.menu-documents a').last().isVisible(),'last document must be reachable');
   const footerBounds=async()=>page.locator('footer').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return [r.width,r.height,...[...el.querySelectorAll('h2,.footer-description,.footer-nav,.footer-serial,.triangle,.footer-wordmark,.footer-bottom')].flatMap(e=>{const b=e.getBoundingClientRect();return [b.left-r.left,b.top-r.top,b.width,b.height];})];
   });
   await page.goto(base+'/#top');await page.evaluate(()=>document.fonts.ready);
   const homeFooter=await footerBounds();
   await page.goto(base+'/app.html?screen=contact');await page.evaluate(()=>document.fonts.ready);
   const contactFooter=await footerBounds();
   assert.equal(homeFooter.length,contactFooter.length);
   homeFooter.forEach((value,i)=>assert(Math.abs(value-contactFooter[i])<.1,'footer differs from the landing composition'));
  }
  // Every FAQ state must fit its column, including long titles after a resize.
  for(const width of [320,390,700,768,1440,1920]){
   await page.setViewportSize({width,height:900});
   await page.goto(base+'/#faq');await page.evaluate(()=>document.fonts.ready);
   for(let i=0;i<6;i++){
    await page.locator(`[data-question="${i}"]`).click();
    const faq=await page.locator('.answer').evaluate(el=>{
     const title=el.querySelector('h3'),body=el.querySelector('.answer-body');
     const range=document.createRange();range.selectNodeContents(title);
     const glyph=range.getBoundingClientRect(),heading=title.getBoundingClientRect(),text=body.getBoundingClientRect();
     return {glyph:glyph.toJSON(),heading:heading.toJSON(),body:text.toJSON(),width:innerWidth};
    });
    assert(faq.glyph.right<=faq.heading.right+1,`FAQ title ${i} exceeds its column at ${width}`);
    assert(faq.glyph.right<=width,`FAQ title ${i} clips at the screen edge at ${width}`);
    assert(faq.body.right<=width,`FAQ body ${i} clips at the screen edge at ${width}`);
    assert(faq.glyph.bottom<faq.body.top,`FAQ heading overlaps its answer at ${width}`);
   }
  }
  for(const [old,section] of Object.entries({objects:'objects',join:'selection',faq:'faq',nfc:'nfc','next-item':'next-item',loading:'top'})){
   await page.goto(base+'/app.html?screen='+old);await page.waitForURL('**/index.html#'+section);
   assert.equal(await page.locator('#'+section).count(),1);
  }
  await page.goto(base+'/app.html?screen=contact');
  await page.locator('.site-header a').filter({hasText:'МЕНЮ /'}).click();await page.waitForURL('**screen=menu');
  await page.keyboard.press('Escape');await page.waitForURL('**screen=contact');
  for(const [width,height] of [[1366,768],[1440,900],[1920,700],[2560,600]]){
   await page.setViewportSize({width,height});await page.goto(base+'/#top');await page.evaluate(()=>document.fonts.ready);
   const hero=await page.evaluate(()=>{
    const r=document.querySelector('.hero').getBoundingClientRect();
    const actions=document.querySelector('.actions').getBoundingClientRect();
    const title=document.querySelector('.intro h1').getBoundingClientRect();
    const logo=document.querySelector('.wordmark').getBoundingClientRect();
    return {height:r.height,actionsBottom:actions.bottom-r.top,titleTop:title.top-r.top,logoBottom:logo.bottom-r.top};
   });
   assert(Math.abs(hero.height-height)<1,`hero must fill the first viewport at ${width}x${height}`);
   assert(hero.actionsBottom<=height&&hero.titleTop>hero.logoBottom,`hero content clipped at ${width}x${height}`);
  }
  await page.setViewportSize({width:390,height:844});
  // The source files have different padding. Compare their visible product bounds.
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:900});
   const bounds=[];
   for(const name of ['wallet','wallet-white']){
    await page.goto(base+`/app.html?screen=${name}&demo=1`);await page.evaluate(()=>document.fonts.ready);
    bounds.push(await page.locator('#gallery-main').evaluate(img=>{
     const r=img.getBoundingClientRect(),stage=img.parentElement.getBoundingClientRect();
     const [x,y,w,h,sw,sh]=img.src.includes('white')?[113,287,1028,711,1254,1254]:[73,80,519,384,664,543];
     return {x:r.x-stage.x+x/sw*r.width,y:r.y-stage.y+y/sh*r.height,width:w/sw*r.width,height:h/sh*r.height};
    }));
   }
   for(const key of ['x','y','width','height'])assert(Math.abs(bounds[0][key]-bounds[1][key])<.2,`visible product ${key} mismatch at ${width}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(base+'/#ceowallet');
  assert.equal(await page.locator('.wallet > .text-action').count(),0);
  assert.equal(await page.locator('.wallet > .object-arrows').count(),1);
  assert.equal(await page.locator('.wallet > .buy-action').count(),1);
  assert(await page.locator('input[value=white]').isChecked());
  assert.equal((await page.locator('.wallet .price').innerText()).replace(/\s/g,''),'2990₽');
  await page.locator('input[value=black]').check();
  assert.equal(new URL(await page.locator('.buy-action').getAttribute('href'),base).searchParams.get('colour'),'black');
  await page.locator('input[value=white]').check();
  await page.locator('.wallet h3 a').click();
  assert.equal(new URL(page.url()).searchParams.get('screen'),'wallet');
  assert.equal(new URL(page.url()).searchParams.get('colour'),'white');
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
  assert.equal((await page.locator('.cart-summary .total').innerText()).replace(/\s/g,''),'5980₽');
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
  await page.goto(base+'/#faq');await page.locator('[data-question="0"]').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-question="1"]').getAttribute('aria-selected'),'true');
  console.log('PASS: gallery, product links, invalid/valid code, cart persistence, quantity/removal, checkout validation, payment states, contact form, FAQ keyboard navigation, non-demo guards');
  fs.writeFileSync(artifact('ceoland-site-validation.json'),JSON.stringify({screens:routes.length,widths:7,failures,errors},null,2));
  console.log(JSON.stringify({failures,errors},null,2));
  assert.equal(failures.length,0,'responsive layout failures');assert.equal(errors.length,0,'browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
