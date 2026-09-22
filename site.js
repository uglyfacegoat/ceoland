/* Public website screens. No administration UI. Server operations are explicitly
   separated from the opt-in, session-only design preview. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const screen = params.get('screen') || 'objects';
  const root = document.querySelector('#site-root');
  const PRICE = 2990;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  const route = (name, extra = {}) => 'app.html?' + new URLSearchParams({screen:name,...(demo?{demo:'1'}:{}),...extra});
  const home = 'index.html';
  const read = (key, fallback) => {try {return JSON.parse(sessionStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
  const write = (key,value) => {try {sessionStorage.setItem(key,JSON.stringify(value));return true;} catch {return false;}};
  const cartKey = demo ? 'ceo-preview-cart-v1' : 'ceo-cart-v1';
  let cart = read(cartKey, []);
  if (!Array.isArray(cart)) cart=[];
  cart=cart.filter(x=>x && ['black','white'].includes(x.colour) && Number.isInteger(x.quantity) && x.quantity>0 && x.quantity<=10);
  const selected = params.get('colour') === 'black' || screen === 'wallet' ? 'black' : 'white';
  const sampleCart = [{colour:selected,quantity:1}];
  if(demo && screen==='cart' && !sessionStorage.getItem(cartKey)) {cart=sampleCart;write(cartKey,cart);}
  const activeCart = cart.length ? cart : (demo ? sampleCart : []);
  const count = items => items.reduce((n,x)=>n+x.quantity,0);
  const total = items => count(items)*PRICE;
  const colourName = c => c==='white'?'Белый':'Чёрный';
  const photo = c => c==='white'?'assets/wallet-white-front.png':'assets/imgOriginalCeowalletBlack.png';
  const link = (text,name,outline=false,extra={}) => `<a class="site-button${outline?' outline':''}" href="${route(name,extra)}"><span>${text}</span><span aria-hidden="true">→</span></a>`;
  const homeButton = (text='НА ГЛАВНУЮ',outline=false) => `<a class="site-button${outline?' outline':''}" href="${home}"><span>${text}</span><span aria-hidden="true">→</span></a>`;
  const submit = text => `<button class="site-button" type="submit"><span>${text}</span><span aria-hidden="true">→</span></button>`;
  const action = (text,id,outline=false) => `<button class="site-button${outline?' outline':''}" type="button" data-action="${id}"><span>${text}</span><span aria-hidden="true">→</span></button>`;
  const row = (name,value) => `<div class="key-value"><span>${name}</span><span>${value}</span></div>`;
  const rule = '<hr class="rule">';
  const slashes = '<img class="site-slashes" src="assets/imgAccentHorizontalSlashRhythm.svg" width="320" height="40" alt="">';
  const alert = '<p class="form-alert" role="alert" data-form-alert></p>';
  const field = (name,label,placeholder='',type='text',required=true,value='') => `<label class="field" for="${name}">${label}<input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" ${required?'required':''} ${type==='email'?'autocomplete="email"':type==='tel'?'autocomplete="tel"':name==='name'?'autocomplete="name"':''} value="${escape(value)}" aria-describedby="${name}-error" ${name==='code'?'autocapitalize="characters" spellcheck="false" maxlength="64"':''}><span class="field-error" id="${name}-error"></span></label>`;
  const textarea = (name,label,placeholder) => `<label class="field" for="${name}">${label}<textarea id="${name}" name="${name}" placeholder="${placeholder}" required aria-describedby="${name}-error"></textarea><span class="field-error" id="${name}-error"></span></label>`;
  const consent = (name='privacy') => {
    const labels={privacy:'политикой конфиденциальности',agreement:'пользовательским соглашением','purchase-terms':'условиями покупки'};
    return `<label class="consent"><input type="checkbox" name="${name}" required><span>Согласен с <a href="${route(name)}" target="_blank" rel="noopener">${labels[name]}</a>.</span></label>`;
  };
  const intro = (title,caption='',cls='') => `<header class="page-intro ${cls}"><h1>${title}</h1>${caption?`<p>${caption}</p>`:''}</header>`;
  const signature = '<div class="signature" aria-hidden="true">CEOMENTALITY<span>CEOMENTALITY</span></div>';
  const footer = () => `<footer class="site-footer"><p>CEOMENTALITY　 /　 MORE THAN A CLUB.</p>${signature}</footer>`;
  const navigation = [['КЛУБ',home+'#community'],['ОБЪЕКТЫ',route('objects')],['FAQ',route('faq')],['КОРЗИНА',route('cart')]];
  const header = () => `<header class="site-header"><a class="site-logo" href="${home}" aria-label="CEOMENTALITY — главная"><img src="assets/wordmark.svg" alt="CEOMENTALITY" width="181" height="14"></a><nav class="site-nav" aria-label="Основная навигация">${navigation.map(([label,url])=>`<a href="${url}">${label}</a>`).join('')}</nav><a class="mobile-menu" href="${route('menu')}">МЕНЮ /</a></header>`;
  const docLinks = [['Конфиденциальность','privacy'],['Соглашение','agreement'],['Условия покупки','purchase-terms'],['Реквизиты','company']];
  const fullFooter = () => `<footer class="full-footer"><div class="full-footer-grid"><div><h2>СВОЙ<br>КРУГ.</h2><p>Закрытый клуб молодых предпринимателей.<br>Ручной отбор. Общение. Общие цели.</p></div><nav aria-label="Разделы сайта"><div><h3>КЛУБ</h3><a href="${home}#community">О сообществе</a><a href="${route('join')}">КАК ВСТУПИТЬ</a><a href="${route('faq')}">Вопросы и ответы</a></div><div><h3>ОБЪЕКТЫ</h3><a href="${route('objects')}">Вся линейка</a><a href="${route('wallet-white')}">CEOWALLET</a><a href="${route('nfc')}">NFC CARD</a></div><div><h3>ИНФОРМАЦИЯ</h3><a href="${route('contact')}">Контакты</a>${docLinks.map(([t,r])=>`<a href="${route(r)}">${t}</a>`).join('')}</div></nav></div><div class="full-footer-word">CEOMENTALITY</div><div class="full-footer-bottom"><span>© CEOMENTALITY / 2026</span><span>MORE THAN A CLUB.</span></div></footer>`;
  const colours = c => `<nav class="colour-options" aria-label="Цвет картхолдера">${['black','white'].map((x,i)=>`<a class="colour-option" href="${route(x==='white'?'wallet-white':'wallet')}" aria-current="${x===c}"><img src="assets/imgColourSwatch${i?'1':''}.svg" width="15" height="15" alt="">${colourName(x)}</a>`).join('')}</nav>`;
  const review = (items=activeCart) => {
    const list=items.length?items:sampleCart;
    return `<div class="stack summary"><h3>ТВОЙ ОБЪЕКТ</h3><div class="summary-photo wallet-visual"><img src="${photo(list[0].colour)}" alt="CEOWALLET — ${colourName(list[0].colour)}" width="624" height="510"></div>${list.map(x=>row(`CEOWALLET × ${x.quantity}`,money(x.quantity*PRICE))+row('Цвет',colourName(x.colour))).join('')}${row('Доставка','По адресу')}${rule}<p class="total">${money(total(list))}</p><p class="small muted">Стоимость объекта без доставки</p></div>`;
  };
  function product() {
    const white=screen==='wallet-white';
    const c=white?'white':'black';
    const images=white?[photo(c),'assets/wallet-white-angle.png','assets/wallet-white-back.png','assets/wallet-white-side.png']:[photo(c),'assets/wallet-black-back.png'];
    return intro('CEOWALLET.','OBJECT 01 / LIMITED EDITION')+`<div class="product-detail"><p class="detail-price">${money(PRICE)}</p><div class="product-gallery"><div class="gallery-main wallet-visual"><img id="gallery-main" src="${images[0]}" alt="CEOWALLET — ${colourName(c)}, вид спереди" width="624" height="510"></div><div class="gallery-thumbs" aria-label="Ракурсы">${images.map((src,i)=>`<button type="button" data-gallery="${src}" aria-label="Ракурс ${i+1}" aria-pressed="${i===0}"><span class="wallet-visual"><img src="${src}" alt="" width="138" height="130"></span></button>`).join('')}</div><p class="gallery-caption">CEOMENTALITY / CEOWALLET　 •　 РАКУРСЫ</p></div><div class="stack product-information"><p>Натуральная кожа. Два цвета. Предмет из линейки CEOMENTALITY.</p><p>Покупка CEOWALLET не гарантирует вступление в клуб. Заявка на членство рассматривается отдельно.</p>${colours(c)}${row('КОЛЛЕКЦИЯ','Access')}${rule}<p class="small">Для покупки нужен действующий код доступа.</p><div class="action-stack">${link('КУПИТЬ ПО КОДУ','access',false,{colour:c})}${link('НЕТ КОДА? ЗАПРОСИТЬ','purchase-application',true,{colour:c})}</div><p class="small muted">Условия доставки и оплаты — при оформлении заказа.</p></div></div>`;
  }
  function catalog() {
    return intro('OBJECTS.','ЛИНЕЙКА ОБЪЕКТОВ CEOMENTALITY.<br>ПРОДУКЦИЯ ≠ ЧЛЕНСТВО.')+`<div class="catalog-list">${[
      ['wallet-white','CEOWALLET','НАТУРАЛЬНАЯ КОЖА',photo('white')],
      ['nfc','NFC CARD','МЕТАЛЛИЧЕСКАЯ NFC-ВИЗИТКА','assets/imgOriginalNfcTeaserSuppliedPhotograph.png'],
      ['next-item','NEXT ITEM','СЛЕДУЮЩИЙ ОБЪЕКТ CEOMENTALITY','assets/imgOriginalNfcTeaserSuppliedPhotograph.png']
    ].map(([r,name,material,src],i)=>`<article class="catalog-item"><div class="catalog-copy"><p class="eyeline accent">OBJ / 0${i+1}${i?' — СКОРО':''}</p><h2><a href="${route(r)}">${name}</a></h2><p class="small muted">${material}</p>${i?'<p class="accent" style="margin-top:32px">В РАЗРАБОТКЕ</p>':`<p class="detail-price">${money(PRICE)}</p>${colours('white')}<div class="catalog-arrows type-object" data-type="arrows" aria-hidden="true"></div>`}</div><a class="catalog-photo ${i===0?'wallet-visual':''}" href="${route(r)}" aria-label="Открыть ${name}"><img src="${src}" alt="${i?'Будущий объект под белой тканью':name}" width="664" height="543"></a></article>`).join('')}</div>`;
  }
  function teaser() {
    const next=screen==='next-item';
    return intro(next?'NEXT ITEM.':'NFC CARD.',`OBJECT ${next?'03':'02'} / В РАЗРАБОТКЕ`)+`<div class="site-grid"><div class="stack"><img class="gallery-main" src="assets/imgOriginalNfcTeaserSuppliedPhotograph.png" width="646" height="426" alt="Будущий объект под белой тканью"><p class="eyeline muted">${next?'NEXT ITEM':'NFC CARD'} / ТИЗЕР — НЕ ФИНАЛЬНЫЙ ДИЗАЙН</p></div><div class="stack"><h2>В РАЗРАБОТКЕ</h2><p>${next?'Следующий объект CEOMENTALITY. Подробности появятся после анонса.':'Металлическая NFC-визитка CEOMENTALITY. Продукт в разработке; финальный дизайн ещё не представлен.'}</p><p>Покупка продукции не гарантирует членство. Вступление проходит через отдельный ручной отбор.</p>${row('ФОРМАТ',next?'Скоро':'NFC-визитка')}${row('РЕЛИЗ','Готовится')}${rule}<p>Подробности — после анонса дропа.</p>${link('К ОБЪЕКТАМ','objects')}<p class="small muted">Изображение — тизер будущего продукта.</p></div></div>`;
  }
  function access() {
    const error=screen==='code-error';
    return intro('ТВОЙ ДОСТУП.','КОД　/　КОРЗИНА　/　ДАННЫЕ　/　ОПЛАТА')+`<div class="site-grid code-content"><div class="stack"><h2>КОД<br>ДЛЯ ПОКУПКИ.</h2><p class="lead">Введи код для покупки. Только после проверки — корзина, данные и оплата. Просмотр каталога открыт без кода.</p>${slashes}</div><form class="stack code-form" data-form="access" novalidate>${field('code','КОД ДОСТУПА','LORA-7X92-KD31','text',true,error?'LORA-7X92-KD31':'')}${error?'<p class="field-error">Код недействителен или уже использован.</p>':''}${demo?'<p class="small muted">Код для проверки сценария: <button class="text-link" type="button" data-action="fill-code">CEO-DEMO-2026</button></p>':''}${alert}${submit(error?'ПРОВЕРИТЬ ЕЩЁ РАЗ':'ПРОВЕРИТЬ И ПРОДОЛЖИТЬ')}${link('НЕТ КОДА? ЗАПРОСИТЬ','purchase-application',true,{colour:selected})}${rule}${row('В корзине',`${count(activeCart)||1} объект`)}${row('Сумма',money(total(activeCart)||PRICE))}</form></div>`;
  }
  function emptyCart() {return statusPage('ПОКА ПУСТО.','В корзине ещё нет объектов.','Начни с того, что откликается.<br><br>Лимитированные объекты CEOMENTALITY ждут в каталоге.',link('К ОБЪЕКТАМ','objects')+homeButton('НА ГЛАВНУЮ',true),'000 / ∞');}
  function cartPage() {
    if(screen==='cart-empty'||!cart.length)return emptyCart();
    return intro('КОРЗИНА.','Твой выбор / продукция CEOMENTALITY')+`<div class="site-grid wide-left"><div class="stack"><div class="cart-items">${cart.map((x,i)=>`<article class="cart-item"><div class="wallet-visual"><img src="${photo(x.colour)}" alt="CEOWALLET — ${colourName(x.colour)}" width="230" height="230"></div><div class="stack"><h3><a href="${route(x.colour==='white'?'wallet-white':'wallet')}">CEOWALLET</a></h3><p class="small muted">Натуральная кожа<br>${colourName(x.colour)}</p><p>${money(x.quantity*PRICE)}</p><div class="quantity" aria-label="Количество"><button type="button" data-quantity="${i}" data-delta="-1" aria-label="Уменьшить количество">−</button><output>${x.quantity}</output><button type="button" data-quantity="${i}" data-delta="1" aria-label="Увеличить количество" ${x.quantity>=10?'disabled':''}>+</button></div><button class="text-link" type="button" data-remove="${i}">УДАЛИТЬ ×</button></div></article>`).join('')}</div>${link('ПРОДОЛЖИТЬ ПОКУПКИ','objects',true)}</div><aside class="stack cart-summary"><h3>ИТОГО</h3><p class="total">${money(total(cart))}</p>${row('Объекты',String(count(cart)))}${rule}<p class="muted">Стоимость доставки будет рассчитана при оформлении заказа.</p>${link('ОФОРМИТЬ ЗАКАЗ',demo&&read('ceo-preview-access',false)?'checkout':'access')}<p class="small">${demo&&read('ceo-preview-access',false)?'✓ Код для покупки подтверждён.':'Для покупки нужен действующий код доступа.'}</p></aside></div>`;
  }
  function checkout() {
    const invalid=screen==='checkout-validation';
    return intro('ОФОРМЛЕНИЕ.','КОД ✓　/　КОРЗИНА ✓　/　ДАННЫЕ　/　ОПЛАТА')+`<form data-form="checkout" novalidate>${invalid?'<p class="form-alert" style="margin-bottom:28px">Проверь email, телефон и обязательные согласия. Остальные данные сохранены.</p>':''}<div class="site-grid wide-left"><div class="stack form-fields"><h3>01 / КОНТАКТЫ</h3>${field('name','ИМЯ И ФАМИЛИЯ','Как к вам обращаться')}${field('email','EMAIL','you@example.com','email',true,invalid?'you@':'')}${field('phone','ТЕЛЕФОН','+7 ___ ___-__-__','tel',true,invalid?'+7 900':'')}<h3>02 / ДОСТАВКА</h3>${field('city','ГОРОД','Укажи город')}${field('address','АДРЕС','Улица, дом, квартира')}${field('comment','КОММЕНТАРИЙ · НЕОБЯЗАТЕЛЬНО','Что нужно знать о доставке','text',false)}<p class="small muted">Стоимость доставки рассчитывается по адресу.</p></div><aside class="stack">${review()}${consent()}${consent('agreement')}${consent('purchase-terms')}${alert}${submit(invalid?'ИСПРАВИТЬ ДАННЫЕ':'ПЕРЕЙТИ К ОПЛАТЕ')}<p class="eyeline">✓ Код подтверждён. Следующий шаг — оплата.</p></aside></div></form>`;
  }
  function formPage(kind) {
    const purchase=kind==='purchase-application', membership=kind==='application';
    const title=purchase?'ЗАПРОС КОДА.':membership?'by invitation.':'НА СВЯЗИ.';
    const caption=purchase?'Нет кода для покупки? Оставь контакты.':membership?'QR-приглашение / заявка на вступление':'По заказам, продукции и сотрудничеству';
    const form=`<form class="stack form-fields" data-form="${kind}" novalidate>${field('name','ИМЯ','Как к вам обращаться')}${purchase?field('phone','ТЕЛЕФОН','+7 ___ ___-__-__','tel'):''}${field('email','EMAIL','you@example.com','email')}${membership?field('phone','ТЕЛЕФОН','+7 ___ ___-__-__','tel')+field('telegram','TELEGRAM','@username')+textarea('project','ПРОЕКТ И ЦЕЛИ','Чем занимаешься и почему хочешь к нам')+field('invitation','КОД ПРИГЛАШЕНИЯ · НЕОБЯЗАТЕЛЬНО','Если тебя пригласил участник','text',false):purchase?field('comment','КОММЕНТАРИЙ · НЕОБЯЗАТЕЛЬНО','Вопрос или детали покупки','text',false):textarea('message','СООБЩЕНИЕ','Твой вопрос или предложение')}${consent()}${alert}${submit(purchase?'ЗАПРОСИТЬ КОД':membership?'ОТПРАВИТЬ ЗАЯВКУ':'ОТПРАВИТЬ СООБЩЕНИЕ')}</form>`;
    const side=membership?`<div class="stack"><h2>РАССКАЖИ<br>О СЕБЕ.</h2><p>Мы внимательно изучаем каждую заявку. Оставь контакты, свой проект и цели — команда вернётся с ответом.</p>${slashes}</div>`:purchase?`<aside class="stack"><h3>ТВОЙ ОБЪЕКТ</h3><div class="summary-photo wallet-visual"><img src="${photo(selected)}" width="624" height="510" alt="CEOWALLET"></div><h3>CEOWALLET</h3><p>Это запрос кода для покупки CEOWALLET.</p><p class="muted">Анкета в клуб откроется отдельно — по QR внутри полученного картхолдера.</p></aside>`:`<aside class="stack"><h2>ПО ДЕЛУ.<br>НАПРЯМУЮ.</h2><p>Если вопрос связан с покупкой, укажи номер заказа. Для вступления в клуб есть отдельная заявка.</p>${link('КАК ВСТУПИТЬ','join',true)}</aside>`;
    return intro(title,caption)+`<div class="site-grid ${membership?'':'wide-left'}">${membership?side+form:form+side}</div>`;
  }
  function signal(text='001 / ∞') {return `<div class="status-signal" aria-hidden="true"><img src="assets/barcode.svg" width="140" height="360" alt=""><strong>${text.includes('SENT')?'SENT<br>001':text.includes('000')?'000':text.startsWith('×')?'×':text.startsWith('…')?'…':'001'}</strong><small>${text}</small></div>`;}
  function statusPage(title,caption,copy,buttons,mark='001 / ∞',extra='') {return intro(title,caption)+`<div class="status-layout"><div class="stack"><p class="status-copy">${copy}</p>${extra}<div class="action-stack">${buttons}</div></div>${signal(mark)}</div>`;}
  function status() {
    switch(screen) {
      case 'purchase-received':return statusPage('ЗАЯВКА ОТПРАВЛЕНА.','Покупка продукции / обращение принято','Запрос кода отправлен. Команда свяжется с тобой по указанным контактам.<br><br>Когда получишь код, введи его перед покупкой. Этот запрос не является анкетой на членство.',link('ВВЕСТИ ПОЛУЧЕННЫЙ КОД','access')+homeButton('НА ГЛАВНУЮ',true),'SENT / 001');
      case 'application-received':return statusPage('ПРИНЯТО.<br>НА СВЯЗИ.','Заявка отправлена.','Твои контакты переданы команде.<br>Мы рассмотрим заявку и вернёмся с ответом.<br><br>Приглашение в клуб придёт отдельно после рассмотрения.',homeButton()+link('ПОСМОТРЕТЬ ОБЪЕКТЫ','objects',true));
      case 'contact-received':return statusPage('НА СВЯЗИ.','Сообщение отправлено','Команда получила твоё сообщение. Ответ придёт на указанный email.<br><br>Если вопрос связан с заказом, его статус можно проверить на отдельном экране.',homeButton()+link('ВОПРОСЫ И ОТВЕТЫ','faq',true),'SENT / 002');
      case 'processing':return statusPage('ОДИН МОМЕНТ.','Получаем подтверждение оплаты.','Это может занять немного времени.<br><br>Не оплачивай заказ повторно, пока статус не обновится.',action('ОБНОВИТЬ СТАТУС','refresh-payment')+link('К ЗАКАЗУ','order',true),'… / ∞','<p class="eyeline accent">● ОЖИДАЕМ ОТВЕТ ПЛАТЁЖНОГО СЕРВИСА</p>'+alert);
      case 'payment-failed':return statusPage('НЕ ПРОШЛО.','Платёж не подтверждён.','Проверь реквизиты карты и попробуй ещё раз.<br><br>Если проблема повторяется, используй другую карту. Заказ сохранён — заполнять его заново не нужно.',link('ПОПРОБОВАТЬ СНОВА','payment')+link('ВЕРНУТЬСЯ К ЗАКАЗУ','checkout',true),'× / ∞');
      case 'thank-you':return statusPage('СПАСИБО.','Покупка подтверждена.','Оплата подтверждена. Детали заказа придут на email.<br><br>После получения найди карточку с QR внутри картхолдера. По QR откроется анкета в клуб. Решение — после ручного отбора.',link('К ЗАКАЗУ','order')+link('КАК ВСТУПИТЬ В КЛУБ','join',true),'001 / ∞',row(`CEOWALLET × ${count(activeCart)||1}`,money(total(activeCart)||PRICE)));
    }
  }
  function payment() {
    return intro('ОПЛАТА.','01 / ДАННЫЕ ✓　 →　02 / КОД ✓　 →　03 / ОПЛАТА')+`<div class="site-grid wide-left"><div class="stack"><div class="payment-placeholder"><h3>● БАНКОВСКАЯ КАРТА</h3><label class="field">НОМЕР КАРТЫ<input placeholder="0000 0000 0000 0000" disabled aria-label="Номер карты — платёжный сервис не подключён"></label><div class="payment-pair"><label class="field">СРОК ДЕЙСТВИЯ<input placeholder="ММ / ГГ" disabled></label><label class="field">CVC / CVV<input placeholder="•••" disabled></label></div><p class="small muted">Платёжные данные обрабатывает платёжный сервис.</p></div>${alert}${action('ОПЛАТИТЬ '+money(total(activeCart)||PRICE),'pay')}${link('ВЕРНУТЬСЯ К ЗАКАЗУ','checkout',true)}${demo?`<div class="preview-controls">Состояния оплаты: <a href="${route('processing')}">Ожидание</a><a href="${route('thank-you')}">Успешно</a><a href="${route('payment-failed')}">Ошибка</a></div>`:''}</div><aside class="stack"><h3>К ОПЛАТЕ</h3><p class="total">${money(total(activeCart)||PRICE)}</p>${row('Объект','CEOWALLET')}${row('Цвет',colourName(activeCart[0]?.colour||selected))}${row('Количество',String(count(activeCart)||1))}${rule}<p class="muted">Проверь сумму перед оплатой.<br>После подтверждения откроется статус заказа.</p></aside></div>`;
  }
  function order() {
    return intro('ТВОЙ ЗАКАЗ.','ЗАКАЗ № 0001 / статус и состав')+`<div class="site-grid wide-left"><div class="stack"><h2>В ОБРАБОТКЕ</h2><p>Оплата подтверждена. Готовим заказ к передаче. Когда появятся данные отправления, они будут здесь.</p><ol class="timeline">${[['СОЗДАН','Состав заказа и контакты сохранены'],['ОПЛАЧЕН ✓','Оплата подтверждена · код использован'],['В ОБРАБОТКЕ ●','Подготавливаем к отправке'],['ВЫПОЛНЕН','Информация о получении появится после отправки']].map(([t,p],i)=>`<li><strong class="${i===2?'accent':''}">0${i+1} / ${t}</strong><p>${p}</p></li>`).join('')}</ol></div><aside class="stack">${review()}${row('Код','Использован')}<p class="small muted">Анкета в клуб — по QR на карточке внутри полученного картхолдера. Покупка не гарантирует членство.</p>${alert}${action('ОБНОВИТЬ СТАТУС','refresh-order')}${link('КАК ВСТУПИТЬ В КЛУБ','join',true)}</aside></div>`;
  }
  function membershipConfirmed() {return intro('ТЫ ВНУТРИ.','Приглашение в клуб / вступление одобрено')+`<div class="site-grid wide-left"><div class="stack"><img class="gallery-main" src="assets/imgInvitationSuppliedOriginal.png" width="592" height="345" alt="Membership confirmed. Welcome to the club."><p class="eyeline muted">THIS CARD CONNECTS YOU TO PEOPLE LIKE YOU.</p></div><div class="stack"><h2>WELCOME<br>TO THE CLUB.</h2><p>Твоя заявка одобрена командой.<br>Добро пожаловать в CEOMENTALITY.</p><p>Информация о вступлении и доступе к сообществу — в приглашении.</p>${link('К ОБЪЕКТАМ','objects')}${link('ВВЕСТИ КОД ДОСТУПА','access',true)}</div></div>`;}
  function join() {return intro('КАК<br>ВСТУПИТЬ.','Покупка не открывает анкету автоматически. Она доступна по QR внутри полученного картхолдера.')+`<ol class="join-steps">${[['ЗАЯВКА НА ПОКУПКУ', 'Оставь контакты, чтобы получить код доступа к покупке.'], ['ПОКУПКА', 'Введи код, выбери картхолдер и дождись доставки.'], ['ЗАЯВКА В КЛУБ', 'Открой анкету по QR внутри картхолдера и расскажи о себе.'], ['ОТБОР', 'Команда вручную рассматривает каждую заявку.'], ['РЕШЕНИЕ', 'Сообщим результат отбора. При одобрении — пригласим в клуб.']].map(([t,p],i)=>`<li><span class="join-number">0${i+1}</span><div><h3>${t}</h3><p>${p}</p></div>${i===2?'<span class="journey-return" aria-hidden="true"><i></i><b></b></span>':''}</li>`).join('')}</ol>${slashes}`;}
  const faqItems=[
    ['Покупка даёт членство?','НЕТ.','Нет. Продукция — физические объекты CEOMENTALITY. Членство проходит через отдельный ручной отбор. Покупка не гарантирует вступление.'],
    ['Как вступить в CEOMENTALITY?','ЧЕРЕЗ ОТБОР.','После получения картхолдера заполните анкету по QR внутри. Команда изучает каждую заявку вручную. После одобрения вы получите приглашение в клуб.'],
    ['Для чего нужен код доступа?','ДОСТУП.','Продукция CEOMENTALITY доступна по коду. Код открывает доступ к покупке объектов. Решение о членстве в клубе принимается отдельно.'],
    ['Можно использовать код повторно?','ОДИН ЗАКАЗ.','После подтверждённой оплаты код считается использованным. Для следующего заказа нужен действующий код доступа.'],
    ['Оплата пока не подтверждена. Что делать?','ПРОВЕРЬТЕ.','Проверьте статус заказа. Не оплачивайте повторно, пока результат платежа неизвестен. Если вопрос не решён, напишите команде и укажите номер заказа.'],
    ['Что будет с линейкой и привилегиями?','ПРОДОЛЖЕНИЕ.','NFC CARD — металлическая NFC-визитка — в разработке. В клубе предусмотрены общение, закрытые встречи и привилегии в местах партнёров.']
  ];
  function faq() {return intro('<span>ВОПРОСЫ.</span><span>ПО ДЕЛУ.</span>','О клубе, объектах<br>и том, как всё устроено.','faq-page-title')+`<div class="site-faq"><div class="faq-index" role="tablist" aria-label="Вопросы" aria-orientation="vertical">${faqItems.map((x,i)=>`<button id="faq-${i}" role="tab" aria-controls="faq-reader" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-faq="${i}"><small>0${i+1}</small><span>${x[0]}</span><span aria-hidden="true">↗</span></button>`).join('')}</div><section class="faq-reader" id="faq-reader" role="tabpanel" tabindex="0" aria-labelledby="faq-0"><p class="eyeline accent" id="faq-number">ОТВЕТ / 01</p><h2 id="faq-title">НЕТ.</h2><p id="faq-body">${faqItems[0][2]}</p><div class="faq-decoration type-object" data-type="question" aria-hidden="true"></div></section></div>`;}
  function documents() {
    const doc=window.CEO_DOCUMENTS[screen];
    const labels={privacy:['Политика конфиденциальности','Как устроена работа с данными на сайте CEOMENTALITY.'],agreement:['Пользовательское соглашение','Использование сайта, продукция и заявки на членство.'],'purchase-terms':['Условия покупки','От выбора объекта до оплаты и получения заказа.'],company:['Реквизиты и контакты','Информация о продавце и каналы связи.']};
    const sections=doc.sections.filter(x=>!/^\d\d \/ [A-Z]+$/.test(x.title));
    return `<header class="page-intro document-title"><p class="breadcrumb"><a href="${home}">ГЛАВНАЯ</a>　/　ДОКУМЕНТЫ</p><h1>${doc.title}</h1><p><strong>${labels[screen][0]}</strong></p><p class="muted">${labels[screen][1]}</p></header><nav class="doc-tabs" aria-label="Документы">${docLinks.map(([t,r])=>`<a href="${route(r)}" ${r===screen?'aria-current="page"':''}>${t}</a>`).join('')}</nav><div class="document-layout"><nav class="document-index" aria-label="Содержание"><p class="eyeline">В ЭТОМ ДОКУМЕНТЕ</p>${sections.map((s,i)=>`<a href="#document-${i}">${escape(s.title.replace(' / ','　'))}</a>`).join('')}${link('СВЯЗАТЬСЯ С КОМАНДОЙ','contact',true)}</nav><article class="document-body">${sections.map((s,i)=>`<section id="document-${i}"><h2>${escape(s.title)}</h2>${s.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</section>`).join('')}<div class="doc-contact"><h2>ВОПРОС ПО ДОКУМЕНТУ?</h2><p>Напиши команде через форму связи. Для вопроса о покупке укажи номер заказа.</p>${link('НАПИСАТЬ КОМАНДЕ','contact')}</div></article></div>`;
  }
  const screens=[['objects','01','Линейка объектов'],['wallet','02','CEOWALLET — чёрный'],['wallet-white','16','CEOWALLET — белый'],['nfc','03','NFC CARD'],['next-item','—','Следующий объект'],['access','08','Код доступа'],['code-error','09','Ошибка кода'],['cart','04','Корзина'],['cart-empty','05','Пустая корзина'],['checkout','10','Оформление'],['checkout-validation','20','Ошибки в форме'],['payment','11','Оплата'],['processing','12','Ожидание оплаты'],['payment-failed','13','Ошибка оплаты'],['thank-you','14','Покупка подтверждена'],['order','19','Статус заказа'],['join','41','Как вступить'],['application','06','Анкета по QR'],['application-received','07','Анкета принята'],['membership-confirmed','15','Вступление одобрено'],['purchase-application','17','Запрос кода'],['purchase-received','18','Запрос принят'],['faq','21','Вопросы и ответы'],['loading','22','Загрузка'],['contact','34','Контакты'],['menu','35','Навигация'],['contact-received','36','Сообщение отправлено'],['privacy','37','Конфиденциальность'],['agreement','38','Соглашение'],['purchase-terms','39','Условия покупки'],['company','40','Реквизиты']];
  function gallery() {return intro('ВСЕ ЭКРАНЫ.','CEOMENTALITY / сайт / desktop + mobile')+`<p class="muted" style="margin-bottom:40px">Предпросмотр интерфейса. Формы, коды и оплата работают в демонстрационном режиме: сообщения не отправляются, деньги не списываются.</p><div class="screen-list">${screens.map(([r,n,t])=>`<a class="screen-card" href="${route(r,{demo:'1'})}"><small>ЭКРАН / ${n}</small><strong>${t}</strong><span aria-hidden="true">↗</span></a>`).join('')}</div>`;}
  const confirmedScreens=['purchase-received','application-received','contact-received','thank-you','order','membership-confirmed'];
  function unavailableStatus() {return intro('СТАТУС.','Информация по твоему обращению')+`<div class="stack" style="max-width:680px"><p>Для просмотра статуса нужна действующая ссылка из подтверждения заказа или приглашения.</p>${link('СВЯЗАТЬСЯ С КОМАНДОЙ','contact')}${homeButton('НА ГЛАВНУЮ',true)}</div>`;}
  function render() {
    let content;
    if(confirmedScreens.includes(screen)&&!demo) content=unavailableStatus();
    else if(window.CEO_DOCUMENTS[screen]) content=documents();
    else switch(screen){
      case 'wallet':case 'wallet-white':content=product();break;
      case 'objects':content=catalog();break;
      case 'nfc':case 'next-item':content=teaser();break;
      case 'access':case 'code-error':content=access();break;
      case 'cart':case 'cart-empty':content=cartPage();break;
      case 'checkout':case 'checkout-validation':content=checkout();break;
      case 'contact':case 'purchase-application':case 'application':content=formPage(screen);break;
      case 'payment':content=payment();break;
      case 'order':content=order();break;
      case 'membership-confirmed':content=membershipConfirmed();break;
      case 'join':content=join();break;
      case 'faq':content=faq();break;
      case 'screens':content=gallery();break;
      case 'menu':content=intro('НАВИГАЦИЯ.','CEOMENTALITY / свой круг')+`<nav class="menu-links" aria-label="Все разделы">${[['КЛУБ',home+'#community'],['ОБЪЕКТЫ',route('objects')],['ВОПРОСЫ',route('faq')],['КОНТАКТЫ',route('contact')],['КОРЗИНА',route('cart')]].map(([t,r])=>`<a href="${r}">${t}</a>`).join('')}</nav>`;break;
      case 'loading':content=`<div class="loading-preview"><img src="assets/wordmark.svg" alt="CEOMENTALITY" width="900" height="64"><div class="loading-track" aria-hidden="true"></div><p class="eyeline muted">ЗАГРУЗКА / 060</p><a href="${home}" class="text-link">НА ГЛАВНУЮ →</a></div>`;break;
      default:content=status()||intro('НЕ НАЙДЕНО.','Такого экрана нет.')+homeButton();
    }
    document.title=(screens.find(x=>x[0]===screen)?.[2]||'Все экраны')+' — CEOMENTALITY';
    root.innerHTML=(demo?`<div class="preview-banner"><span>Предпросмотр · данные не отправляются, оплата тестовая</span><a href="${route('screens')}">Все экраны ↗</a></div>`:'')+header()+`<main class="site-main" id="site-main" tabindex="-1">${content}</main>`+(window.CEO_DOCUMENTS[screen]?fullFooter():footer());
    if(screen==='checkout-validation') validate(document.querySelector('form'),false);
  }
  function showAlert(message,scope=document) {const el=scope.querySelector('[data-form-alert]');if(el){el.textContent=message;el.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  function validate(form,focus=true) {
    let first=null;
    for(const el of form.querySelectorAll('input,textarea')) {
      let message='';
      if(el.required && (el.type==='checkbox'?!el.checked:!el.value.trim())) message=el.type==='checkbox'?'Подтверди обязательные согласия.':'Заполни это поле.';
      else if(el.type==='email'&&el.value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) message='Укажи email в формате name@example.com.';
      else if(el.type==='tel'&&el.value&&(el.value.replace(/\D/g,'').length<10||el.value.replace(/\D/g,'').length>15)) message='Укажи полный номер телефона.';
      el.setAttribute('aria-invalid',String(!!message));
      const error=document.getElementById(el.id+'-error');if(error)error.textContent=message;
      if(message&&!first)first=el;
    }
    if(first){showAlert('Проверь обязательные поля и согласия. Введённые данные сохранены в форме.',form);if(focus)first.focus();return false;}
    showAlert('',form);return true;
  }
  render();
  document.addEventListener('click',event=>{
    const galleryButton=event.target.closest('[data-gallery]');
    if(galleryButton){document.querySelector('#gallery-main').src=galleryButton.dataset.gallery;document.querySelector('#gallery-main').alt=`CEOWALLET — ${galleryButton.getAttribute('aria-label')}`;document.querySelectorAll('[data-gallery]').forEach(b=>b.setAttribute('aria-pressed',String(b===galleryButton)));}
    const quantity=event.target.closest('[data-quantity]'),remove=event.target.closest('[data-remove]');
    if(quantity||remove){const index=Number((quantity||remove).dataset[quantity?'quantity':'remove']);if(!cart[index])return;if(remove)cart.splice(index,1);else{cart[index].quantity+=Number(quantity.dataset.delta);cart=cart.filter(x=>x.quantity>0);}if(!write(cartKey,cart)){showAlert('Не удалось сохранить корзину. Разреши хранение данных в браузере.');return;}render();}
    const faqButton=event.target.closest('[data-faq]');if(faqButton)selectFaq(Number(faqButton.dataset.faq));
    const a=event.target.closest('[data-action]');if(!a)return;
    switch(a.dataset.action){
      case 'fill-code':document.querySelector('[name=code]').value='CEO-DEMO-2026';break;
      case 'pay':if(demo)location.href=route('processing');else showAlert('Оплата пока недоступна. Платёжный сервис ещё не подключён. Деньги не списаны.');break;
      case 'refresh-payment':if(demo)location.href=route('thank-you');else showAlert('Подтверждение оплаты пока недоступно. Не оплачивай повторно.');break;
      case 'refresh-order':showAlert(demo?'Демонстрационный статус обновлён: в обработке.':'Не удалось получить статус заказа. Попробуй позже.');break;
    }
  });
  function selectFaq(index) {
    document.querySelectorAll('[data-faq]').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
    document.querySelector('#faq-reader').setAttribute('aria-labelledby',`faq-${index}`);
    document.querySelector('#faq-number').textContent=`ОТВЕТ / 0${index+1}`;
    document.querySelector('#faq-title').textContent=faqItems[index][1];
    document.querySelector('#faq-body').textContent=faqItems[index][2];
  }
  document.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-faq]');if(!tab)return;
    const index=Number(tab.dataset.faq),next=event.key==='ArrowDown'?(index+1)%6:event.key==='ArrowUp'?(index+5)%6:event.key==='Home'?0:event.key==='End'?5:null;
    if(next!==null){event.preventDefault();selectFaq(next);document.querySelector(`[data-faq="${next}"]`).focus();}
  });
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();
    if(!validate(form))return;
    if(!demo){showAlert('Отправка пока недоступна. Сервис ещё не подключён; данные не отправлены. Попробуй позже.',form);return;}
    const kind=form.dataset.form;
    if(kind==='access') {
      if(form.elements.code.value.trim().toUpperCase()!=='CEO-DEMO-2026'){form.elements.code.setAttribute('aria-invalid','true');showAlert('Код недействителен или уже использован.',form);return;}
      if(!cart.some(x=>x.colour===selected))cart.push({colour:selected,quantity:1});
      if(!write(cartKey,cart)||!write('ceo-preview-access',true)){showAlert('Не удалось сохранить корзину. Разреши хранение данных в браузере.',form);return;}
      location.href=route('cart');return;
    }
    if(kind==='checkout'){
      // Keep contact details only in this tab, never collect payment card data.
      if(!write('ceo-preview-checkout',Object.fromEntries(new FormData(form)))){showAlert('Не удалось сохранить данные в этом браузере.',form);return;}
      location.href=route('payment');return;
    }
    const next={contact:'contact-received','purchase-application':'purchase-received',application:'application-received'}[kind];
    if(next)location.href=route(next);
  });
  if(['checkout','checkout-validation'].includes(screen)&&demo){
    const values=read('ceo-preview-checkout',{}),form=document.querySelector('form');
    for(const [key,value] of Object.entries(values)){const el=form.elements.namedItem(key);if(el){if(el.type==='checkbox')el.checked=true;else el.value=String(value);}}
  }
})();
