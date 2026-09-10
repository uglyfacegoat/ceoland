import { ACCESS_PRICE, formatRubles } from "./catalog";
import { productImages } from "./product-media";

const bagIcon = `
  <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
    <path d="M5 11h22l2 21H3L5 11Z" />
    <path d="M11 14V7a5 5 0 0 1 10 0v7" />
  </svg>`;

export function header(active?: "about" | "how") {
  return `
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="CEOMENTALITY — главная">CEOMENTALITY</a>
      <nav class="navigation" id="primary-navigation" aria-label="Основная навигация">
        <a class="${active === "about" ? "is-active" : ""}" href="/#about">О продукте</a>
        <a class="${active === "how" ? "is-active" : ""}" href="/#how">Как это работает</a>
        <a class="cart-label" href="/cart">Корзина (<span data-cart-count>0</span>)</a>
      </nav>
      <a class="bag" href="/cart" aria-label="Корзина, товаров: 0">${bagIcon}<span class="bag-count" data-cart-count aria-hidden="true">0</span></a>
      <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="primary-navigation" aria-label="Открыть меню"><span></span><span></span></button>
    </header>`;
}

export function footer() {
  return `
    <footer class="site-footer">
      <a class="footer-wordmark" href="/">CEOMENTALITY</a>
      <p class="footer-lead">Практические инструменты<br />для реальных результатов.</p>
      <nav class="footer-links" aria-label="Документы">
        <a href="/privacy">Политика конфиденциальности</a>
        <a href="/terms">Пользовательское соглашение</a>
        <a href="/privacy#details">Реквизиты</a>
        <a href="mailto:hello@ceomentality.ru">Контакты</a>
      </nav>
      <div class="footer-rule"></div>
      <p class="copyright">© 2026 CEOMENTALITY.<br />Все права защищены.</p>
      <p class="footer-motto">Люди. Технологии. Возможности. Результат.</p>
    </footer>`;
}

const collectionProducts = [
  { name: "CEOMENTALITY Access", type: "Картхолдер", image: "product-original", width: 640, largeWidth: 1254, live: true },
  { name: "CEOMENTALITY Hoodie", type: "Худи", image: "hoodie", width: 480, largeWidth: 720, live: false },
  { name: "CEOMENTALITY Cap", type: "Кепка", image: "cap", width: 480, largeWidth: 720, live: false },
  { name: "CEOMENTALITY T-shirt", type: "Футболка", image: "tshirt", width: 480, largeWidth: 720, live: false },
  { name: "CEOMENTALITY Thermos", type: "Термос", image: "thermos", width: 480, largeWidth: 720, live: false },
];

function collection() {
  return `
    <section class="collection" id="collection" aria-labelledby="collection-title">
      <div class="section-kicker">КОЛЛЕКЦИЯ</div>
      <div class="collection-heading">
        <h2 id="collection-title">Больше,<br />чем картхолдер</h2>
        <p>Предметы, которые открывают<br />доступ к сообществу, инструментам<br />и возможностям.</p>
        <div class="rail-controls"><button type="button" data-rail-prev aria-label="Предыдущие товары">←</button><button type="button" data-rail-next aria-label="Следующие товары">→</button></div>
      </div>
      <div class="product-rail">
        ${collectionProducts.map((product) => `
          <article class="collection-card ${product.live ? "is-live" : "is-soon"}">
            <div class="collection-media">
              <img src="/images/editorial/${product.image}-${product.width}.webp" srcset="/images/editorial/${product.image}-${product.width}.webp ${product.width}w, /images/editorial/${product.image}-${product.largeWidth}.webp ${product.largeWidth}w" sizes="(min-width: 1024px) 24vw, 76vw" alt="${product.name}" loading="lazy" decoding="async" width="1254" height="1254" />
              ${product.live ? "" : '<span class="soon-badge">SOON</span>'}
            </div>
            <div class="collection-meta">
              <h3>${product.name}</h3><span>${product.live ? formatRubles(ACCESS_PRICE) : "—"}</span>
              <p>${product.type}</p>
            </div>
            ${product.live
              ? `<a class="card-action" href="/#product">Подробнее <span>→</span></a>`
              : `<button class="card-action is-disabled" type="button" disabled>Скоро в продаже</button>`}
          </article>`).join("")}
      </div>
      <div class="rail-progress" aria-hidden="true"><span>01</span><div><i data-rail-progress></i></div><span>05</span></div>
    </section>`;
}

function accessStory() {
  const steps = [
    ["Получаешь код", "Уникальный код позволяет активировать доступ."],
    ["Заходишь на сайт", "Переходишь на платформу CEOMENTALITY."],
    ["Вводишь свой код", "Используешь уникальный код для активации доступа."],
    ["Получаешь доступ", "Тебе открываются материалы, инструменты и сообщество."],
  ];
  return `
    <section class="access-story" id="how" aria-labelledby="access-story-title">
        <div class="access-heading">
          <div class="section-kicker">КАК ЭТО РАБОТАЕТ</div>
          <h2 id="access-story-title">Один код —<br />и ты внутри</h2>
        </div>
        <div class="access-visual"><img src="/images/editorial/key-still-960.webp" srcset="/images/editorial/key-still-480.webp 480w, /images/editorial/key-still-960.webp 960w, /images/editorial/key-still-1448.webp 1448w" sizes="(min-width: 1024px) 48vw, 100vw" alt="Металлический ключ с гравировкой ACCESS" width="1448" height="1086" loading="lazy" decoding="async" /></div>
        <ol class="access-steps">
            ${steps.map((step, index) => `
              <li>
                <span class="step-number">${String(index + 1).padStart(2, "0")}</span>
                <div><h3>${step[0]}</h3><p>${step[1]}</p></div>
              </li>`).join("")}
        </ol>
    </section>`;
}

export function homePage() {
  return `
    <main class="home-page">
      ${header()}
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-heading">
          <h1 id="hero-title"><span class="title-brand">CEOMENTALITY</span><span class="title-access">Access</span></h1>
        </div>
        <picture class="hero-product">
          <source media="(min-width: 1024px)" srcset="/images/editorial/hero-desktop-1280.webp 1280w, /images/editorial/hero-desktop-1672.webp 1672w" sizes="100vw" width="1672" height="941" />
          <img src="/images/editorial/hero-mobile-960.webp" srcset="/images/editorial/hero-mobile-480.webp 480w, /images/editorial/hero-mobile-960.webp 960w, /images/editorial/hero-mobile-1254.webp 1254w" sizes="(min-width: 680px) 680px, 100vw" alt="Белый картхолдер CEOMENTALITY с синей картой" width="1254" height="1254" fetchpriority="high" decoding="async" />
        </picture>
        <div class="hero-actions">
          <p>Практический доступ к инструментам,<br /> сообществу и опыту.</p>
          <a class="primary-button" href="#product">Получить доступ <span>→</span></a>
        </div>
        <div class="hero-values"><span>Люди</span><span>Технологии</span><span>Возможности</span><span>Результат</span></div>
      </section>

      <section class="product-intro" id="about" aria-labelledby="product-intro-title">
        <div class="product-intro-copy">
          <div class="section-kicker">ПРОДУКТ</div>
          <h2 id="product-intro-title">Больше,<br />чем картхолдер</h2>
          <p>Это доступ. В нужное окружение,<br />к инструментам и возможностям.</p>
        </div>
        <picture class="product-intro-media">
          <source media="(min-width: 1024px)" srcset="/images/editorial/about-desktop-1280.webp 1280w, /images/editorial/about-desktop-1672.webp 1672w" sizes="100vw" width="1672" height="941" />
          <img src="/images/editorial/about-mobile-960.webp" srcset="/images/editorial/about-mobile-480.webp 480w, /images/editorial/about-mobile-960.webp 960w, /images/editorial/about-mobile-1254.webp 1254w" sizes="(min-width: 680px) 680px, 100vw" alt="Три тонких кожаных кармана и печать CEOMENTALITY крупным планом" width="1254" height="1254" loading="lazy" decoding="async" />
        </picture>
      </section>

      ${accessStory()}
      ${productShowcase()}
      ${collection()}
      ${footer()}
    </main>`;
}

function productShowcase(standalone = false) {
  const heading = standalone ? "h1" : "h2";
  return `
      <section class="product-detail" id="product" aria-labelledby="product-title">
        <div class="product-heading">
          <div class="section-kicker">ПРОДУКТ</div>
          <${heading} id="product-title"><span class="title-brand">CEOMENTALITY</span><span>Access</span></${heading}>
        </div>
        <div class="product-gallery">
          <div class="product-main-image" data-view="photo" tabindex="0" role="region" aria-label="Галерея картхолдера, используйте стрелки для переключения"><img src="${productImages[0].source}" alt="${productImages[0].alt}" width="1254" height="1254" loading="lazy" decoding="async" data-gallery-main /></div>
          <div class="gallery-controls"><span data-gallery-counter aria-live="polite">01 / 03</span><button type="button" data-gallery-prev aria-label="Предыдущий кадр">←</button><button type="button" data-gallery-next aria-label="Следующий кадр">→</button></div>
        </div>
        <div class="product-thumbnails">
          ${productImages.map((picture, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-view="${picture.view}" data-gallery-index="${index}" aria-current="${index === 0}" aria-label="${picture.label}"><img src="${picture.thumbnail}" alt="" width="240" height="240" loading="lazy" decoding="async" /><span>${picture.label}</span></button>`).join("")}
        </div>
        <div class="product-info">
          <p>Картхолдер с кодом доступа.<br />Базовый продукт, с которого всё начинается.</p>
          <div class="product-purchase"><strong class="price">${formatRubles(ACCESS_PRICE)}</strong><span class="product-finish">Белый · тёмно-синяя печать</span></div>
          <button class="primary-button" type="button" data-add-to-cart>Добавить в корзину <span>→</span></button>
          <p class="cart-feedback" data-cart-feedback role="status" hidden>Товар в корзине. <a href="/cart">Перейти к заказу →</a></p>
        </div>
      </section>`;
}

export function productPage() {
  return `
    <main class="commerce-page product-page">
      ${header()}
      ${productShowcase(true)}
      ${footer()}
    </main>`;
}

export function cartPage(quantity: number) {
  const total = ACCESS_PRICE * quantity;
  return `
    <main class="commerce-page cart-page">
      ${header()}
      <section class="cart-layout">
        <div class="cart-main">
          <div class="section-kicker">КОРЗИНА</div>
          <h1>Ваш заказ</h1>
          <p class="muted">Проверьте товары и перейдите к оформлению.</p>
          ${quantity === 0 ? `
            <div class="empty-cart"><h2>Корзина пока пуста</h2><p>Добавьте CEOMENTALITY Access, чтобы продолжить.</p><a class="primary-button" href="/#product">Перейти к продукту <span>→</span></a></div>` : `
            <div class="cart-head"><span>Товар</span><span>Количество</span><span>Цена</span></div>
            <article class="cart-line">
              <img src="${productImages[0].thumbnail}" alt="CEOMENTALITY Access" width="240" height="240" />
              <div><h2>CEOMENTALITY Access</h2><p>Картхолдер</p></div>
              <div class="quantity-control"><button type="button" data-quantity="${quantity - 1}" aria-label="Уменьшить количество">−</button><span>${quantity}</span><button type="button" data-quantity="${quantity + 1}" aria-label="Увеличить количество" ${quantity === 9 ? "disabled" : ""}>+</button></div>
              <strong>${formatRubles(total)}</strong>
              <button class="remove-line" type="button" data-quantity="0" aria-label="Удалить товар">×</button>
            </article>`}
          <a class="continue-link" href="/#collection">← &nbsp; Продолжить покупки</a>
        </div>
        <aside class="order-summary">
          <div class="summary-card"><h2>Итого <strong>${formatRubles(total)}</strong></h2><hr /><p><span>Товары (${quantity})</span><span>${formatRubles(total)}</span></p><p><span>Доставка</span><span>Бесплатно</span></p><a class="primary-button ${quantity === 0 ? "is-disabled" : ""}" ${quantity === 0 ? 'aria-disabled="true"' : 'href="/checkout"'}>Перейти к оформлению <span>→</span></a><small>Приём заказов пока не открыт. Корзина сохраняется на этом устройстве.</small></div>
        </aside>
      </section>
      ${footer()}
    </main>`;
}

export function checkoutPage(quantity: number) {
  if (quantity === 0) return cartPage(0);
  const total = ACCESS_PRICE * quantity;
  return `
    <main class="commerce-page checkout-page">
      ${header()}
      <section class="checkout-shell">
        <h1>Оформление заказа</h1>
        <div class="checkout-product"><img src="${productImages[0].thumbnail}" alt="" width="240" height="240" /><span>CEOMENTALITY Access</span><strong>${formatRubles(total)}</strong><span>${quantity} шт.</span></div>
        <form class="checkout-form" data-checkout-form>
          <fieldset><legend>Контактные данные</legend><label>Имя<input name="name" autocomplete="name" required placeholder="Иван Иванов" /></label><label>Телефон<input name="phone" type="tel" autocomplete="tel" required inputmode="tel" placeholder="+7 (___) ___-__-__" /></label><label>Email<input name="email" type="email" autocomplete="email" required placeholder="ivan@example.com" /></label></fieldset>
          <fieldset><legend>Код доступа</legend><label>Код<input name="code" autocomplete="off" placeholder="Например: LOA7-X92-KD31" /></label><a href="/#how">Где получить код?</a></fieldset>
          <fieldset class="payment-methods"><legend>Способ оплаты</legend><label><input type="radio" name="payment" value="card" checked /> Банковская карта</label><label><input type="radio" name="payment" value="sbp" /> СБП (система быстрых платежей)</label><label class="consent"><input type="checkbox" required /><span>Я согласен с <a href="/privacy">политикой конфиденциальности</a></span></label><label class="consent"><input type="checkbox" required /><span>Я согласен с <a href="/terms">пользовательским соглашением</a></span></label></fieldset>
          <div class="checkout-total"><span>К оплате</span><strong>${formatRubles(total)}</strong></div>
          <p class="checkout-notice" role="status">Приём заказов пока не открыт. Товары сохранятся в корзине.</p>
          <button class="primary-button" type="submit" disabled>Оплата скоро будет доступна</button>
        </form>
      </section>
    </main>`;
}

export function orderConfirmationPreview() {
  return `
    <main class="success-page">
      <a class="wordmark" href="/">CEOMENTALITY</a>
      <img src="/images/editorial/hero-mobile-960.webp" alt="CEOMENTALITY Access" width="1254" height="1254" />
      <p class="preview-notice">Макет страницы. Заказ не оформлен.</p>
      <div class="success-check">✓</div>
      <h1>Заказ принят</h1><p>Спасибо. Скоро мы свяжемся с вами<br />и предоставим доступ.</p>
      <a class="primary-button" href="/">На главную <span>→</span></a>
    </main>`;
}

export function legalPage(kind: "privacy" | "terms") {
  const privacy = kind === "privacy";
  return `<main class="commerce-page legal-page">${header()}<article><div class="section-kicker">ДОКУМЕНТЫ</div><h1>${privacy ? "Политика конфиденциальности" : "Пользовательское соглашение"}</h1><p>Актуальную редакцию документа можно запросить у команды CEOMENTALITY. Мы отправим файл и ответим на вопросы до оформления заказа.</p><h2 id="details">Контакты</h2><p><a href="mailto:hello@ceomentality.ru">hello@ceomentality.ru</a></p></article>${footer()}</main>`;
}
