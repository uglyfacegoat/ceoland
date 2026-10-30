const {launch,artifact}=require('./browser-helpers.cjs');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await launch();
 try{
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[],external=[];page.on('pageerror',error=>errors.push(error.message));
  context.on('request',request=>{if(new URL(request.url()).origin!==new URL(base).origin)external.push(request.url());});
  for(const width of [320,375,390,430,700,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const screen of ['privacy','agreement','purchase-terms','company','data-consent','cookies']){
    await page.goto(base+'/app.html?screen='+screen);await page.evaluate(()=>document.fonts.ready);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen+' overflows at '+width);
    assert.equal(await page.locator('.footer a[href*="/data-consent"]').count(),1);
    assert.equal(await page.locator('#legal-pending,[href="#legal-pending"]').count(),0);
    assert(!/по сведениям разработчика|по словам разработчика|по сообщению команды|подтверждены разработчиком/i.test(await page.locator('.site-main').innerText()));
    assert.equal(await page.locator('.footer a[href*="/cookies"]').count(),1);
    const archive=await page.locator('.legal-tools a').first().getAttribute('href');
    const response=await page.request.get(base+'/'+archive);assert.equal(response.status(),200);
    if(screen==='privacy'&&[320,1440].includes(width))await page.screenshot({path:artifact(`legal-privacy-top-${width}.png`)});
   }
   await page.goto(base+'/app.html?screen=contact');
   assert.equal(await page.locator('.consent .consent-policy').count(),0);
   assert.equal(await page.locator('.consent-policy a[href*="/privacy"]').count(),1);
   assert.equal(await page.locator('[name=privacy]').isChecked(),false);
   if([320,1440].includes(width))await page.screenshot({path:artifact(`legal-contact-${width}.png`)});
   await page.goto(base+'/#footer');
   await page.locator('.footer').scrollIntoViewIfNeeded();
   const separated=await page.locator('.footer').evaluate(footer=>{
    const nav=footer.querySelector('.footer-nav').getBoundingClientRect();
    return ['.footer-serial','.footer-wordmark','.triangle'].every(selector=>nav.bottom<=footer.querySelector(selector).getBoundingClientRect().top);
   });
   assert(separated,'legal links overlap footer decoration at '+width);
   if(width<=700){
    assert(await page.locator('.footer').evaluate(footer=>{
     const a=footer.querySelector('.triangle').getBoundingClientRect(),b=footer.querySelector('.footer-serial').getBoundingClientRect();
     return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;
    }),'footer decoration overlaps serial at '+width);
   }
   if([320,1440].includes(width))await page.locator('.footer').screenshot({path:artifact(`legal-footer-${width}.png`)});
  }
  for(const purpose of ['','__proto__','contact']){
   await page.goto(base+'/app.html?screen=data-consent'+(purpose?'&purpose='+purpose:''));
   const body=await page.locator('.document-body').innerText();
   assert.match(body,/ДАЮ СВОЕ СОГЛАСИЕ/);assert(!/undefined|\{\{/.test(body));
   assert((await page.locator('.legal-tools a').first().getAttribute('href')).endsWith('data-consent.html'));
  }
  assert.deepEqual(await context.cookies(),[],'static offline pages must not set cookies');
  assert.deepEqual(external,[],'current frontend must not load unlisted third-party resources');
  assert.deepEqual(errors,[]);
  await context.close();
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),staticPage=await nojs.newPage();
  await staticPage.goto(base+'/app.html?screen=privacy');
  await staticPage.getByRole('link',{name:'Юридические документы доступны без JavaScript'}).click();
  const current=staticPage.locator('section').first();
  await current.getByRole('link',{name:'Согласие на обработку и передачу персональных данных',exact:true}).click();
  assert.match(await staticPage.locator('main').innerText(),/ДАЮ СВОЕ СОГЛАСИЕ/);
  assert(!/\{\{/.test(await staticPage.locator('main').innerText()));
  const response=await staticPage.request.get(new URL('data-consent.txt',staticPage.url()).href);
  assert.match(response.headers()['content-type'],/text\/plain/);assert.match(await response.text(),/Редакция: 2026-10-29/);
  await staticPage.screenshot({path:artifact('legal-without-js-390.png')});
  await nojs.close();
  console.log('PASS: legal links, footer separation, version exports, combined consent, no-JS access, no external requests/cookies on offline pages');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
