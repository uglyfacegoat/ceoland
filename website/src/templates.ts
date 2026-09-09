import { ACCESS_PRICE, formatRubles } from "./catalog";
import { accessFrames, productImages } from "./product-media";

const bagIcon = `
  <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
    <path d="M5 11h22l2 21H3L5 11Z" />
    <path d="M11 14V7a5 5 0 0 1 10 0v7" />
  </svg>`;

export function header(active?: "about" | "how") {
  return `
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="CEOMENTALITY — главная">CEOMENTALITY</a>
      <nav class="navigation" aria-label="Основная навигация">
        <a class="${active === "about" ? "is-active" : ""}" href="/#about">О продукте</a>
        <a class="${active === "how" ? "is-active" : ""}" href="/#how">Как это работает</a>
        <a class="cart-label" href="/cart">Корзина (<span data-cart-count>0</span>)</a>
      </nav>
      <a class="bag" href="/cart" aria-label="Корзина, товаров: ${0}">${bagIcon}</a>
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
  { name: "CEOMENTALITY Access", type: "Картхолдер", image: productImages[0].source, live: true },
  { name: "CEOMENTALITY Hoodie", type: "Худи", image: "/images/studio/hoodie.png", live: false },
  { name: "CEOMENTALITY Cap", type: "Кепка", image: "/images/studio/cap.png", live: false },
  { name: "CEOMENTALITY T-shirt", type: "Футболка", image: "/images/studio/tshirt.png", live: false },
  { name: "CEOMENTALITY Thermos", type: "Термос", image: "/images/studio/thermos.png", live: false },
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
              <img src="${product.image}" alt="${product.name}" loading="lazy" width="1254" height="1254" />
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
    <section class="access-story" id="how" data-access-story aria-labelledby="access-story-title">
      <div class="access-story-sticky" data-access-sticky data-step="1">
        <div class="access-copy">
          <div class="section-kicker">КАК ЭТО РАБОТАЕТ</div>
          <h2 id="access-story-title">Один код —<br />и ты внутри</h2>
          <ol class="access-steps">
            ${steps.map((step, index) => `
              <li data-access-step class="${index === 0 ? "is-active" : ""}">
                <button type="button" data-step-target="${index}" aria-current="${index === 0 ? "step" : "false"}"><span>${String(index + 1).padStart(2, "0")}</span><i></i><span class="step-label">${step[0]}</span></button>
                <p ${index === 0 ? "" : "hidden"}>${step[1]}</p>
              </li>`).join("")}
          </ol>
        </div>
        <div class="access-visual" aria-hidden="true">
          ${accessFrames.map((frame, index) => `<img src="/images/studio/${frame}.png" alt="" width="1672" height="941" loading="lazy" data-key-frame="${index + 1}" />`).join("")}
        </div>
        <div class="story-counter" data-step-counter>01 / 04</div>
        <div class="story-dots"><i></i><i></i><i></i><i></i></div>
        <div class="scroll-hint">↓ <span>Листай дальше</span></div>
      </div>
    </section>`;
}

export function homePage() {
  return `
    <main class="home-page">
      ${header()}
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-product">
          <img src="/images/client/hero-photo.png" alt="Белый картхолдер CEOMENTALITY с синей картой" width="1672" height="941" fetchpriority="high" />
        </div>
        <div class="hero-copy">
          <h1 id="hero-title">CEOMENTALITY<br />Access</h1>
          <p>Практический доступ к инструментам,<br /> сообществу и опыту.</p>
          <a class="primary-button" href="#product">Получить доступ <span>→</span></a>
        </div>
        <div class="hero-values"><span>Люди<br />Технологии<br />Возможности<br />Результат</span><div></div></div>
      </section>

      <section class="product-intro" id="about" aria-labelledby="product-intro-title">
        <div class="product-intro-media"><img src="/images/client/about-photo.png" alt="Три тонких кожаных кармана и печать CEOMENTALITY" width="1672" height="941" loading="lazy" /></div>
        <div class="product-intro-copy">
          <div class="section-kicker">ПРОДУКТ</div>
          <h2 id="product-intro-title">Больше,<br />чем картхолдер</h2>
          <p>Это доступ. В нужное окружение,<br />к инструментам и возможностям.</p>
        </div>
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
        <div class="product-info">
          <div class="section-kicker">ПРОДУКТ</div>
          <${heading} id="product-title">CEOMENTALITY<br />Access</${heading}>
          <p>Картхолдер с кодом доступа.<br />Базовый продукт, с которого всё начинается.</p>
          <strong class="price">${formatRubles(ACCESS_PRICE)}</strong>
          <button class="primary-button" type="button" data-add-to-cart>Добавить в корзину <span>→</span></button>
        </div>
        <div class="product-gallery">
          <div class="product-main-image" data-view="photo"><img src="${productImages[0].source}" alt="${productImages[0].alt}" width="1254" height="1254" loading="lazy" data-gallery-main /></div>
          <div class="gallery-controls"><span data-gallery-counter>01 / 03</span><button type="button" data-gallery-prev aria-label="Предыдущий кадр">←</button><button type="button" data-gallery-next aria-label="Следующий кадр">→</button></div>
        </div>
        <div class="product-thumbnails">
          ${productImages.map((picture, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-view="${picture.view}" data-gallery-index="${index}" aria-current="${index === 0}" aria-label="${picture.label}"><img src="${picture.source}" alt="" width="1400" height="1400" loading="lazy" /><span>${picture.label}</span></button>`).join("")}
          <div class="future-product">▢<span>Скоро<br />новые продукты</span></div>
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
              <img src="${productImages[0].source}" alt="CEOMENTALITY Access" />
              <div><h2>CEOMENTALITY Access</h2><p>Картхолдер</p></div>
              <div class="quantity-control"><button type="button" data-quantity="${quantity - 1}" aria-label="Уменьшить количество">−</button><span>${quantity}</span><button type="button" data-quantity="${quantity + 1}" aria-label="Увеличить количество" ${quantity === 9 ? "disabled" : ""}>+</button></div>
              <strong>${formatRubles(total)}</strong>
              <button class="remove-line" type="button" data-quantity="0" aria-label="Удалить товар">×</button>
            </article>`}
          <a class="continue-link" href="/#collection">← &nbsp; Продолжить покупки</a>
        </div>
        <aside class="order-summary">
          <div class="summary-card"><h2>Итого <strong>${formatRubles(total)}</strong></h2><hr /><p><span>Товары (${quantity})</span><span>${formatRubles(total)}</span></p><p><span>Доставка</span><span>Бесплатно</span></p><a class="primary-button ${quantity === 0 ? "is-disabled" : ""}" ${quantity === 0 ? 'aria-disabled="true"' : 'href="/checkout"'}>Перейти к оформлению <span>→</span></a><small>♙ &nbsp; Безопасная оплата. Ваши данные защищены.</small></div>
          <div class="delivery-note">◇ <span><strong>Бесплатная доставка</strong><small>При заказе от 10 000 ₽</small></span></div>
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
        <div class="checkout-product"><img src="${productImages[0].source}" alt="" /><span>CEOMENTALITY Access</span><strong>${formatRubles(total)}</strong><span>${quantity} шт.</span></div>
        <form class="checkout-form" data-checkout-form>
          <fieldset><legend>Контактные данные</legend><label>Имя<input name="name" autocomplete="name" required placeholder="Иван Иванов" /></label><label>Телефон<input name="phone" autocomplete="tel" required inputmode="tel" placeholder="+7 (___) ___-__-__" /></label><label>Email<input name="email" type="email" autocomplete="email" required placeholder="ivan@example.com" /></label></fieldset>
          <fieldset><legend>Код доступа</legend><label>Код<input name="code" autocomplete="off" placeholder="Например: LOA7-X92-KD31" /></label><a href="/#how">Где получить код?</a></fieldset>
          <fieldset class="payment-methods"><legend>Способ оплаты</legend><label><input type="radio" name="payment" value="card" checked /> Банковская карта <span>VISA ●</span></label><label><input type="radio" name="payment" value="sbp" /> СБП (система быстрых платежей)</label><label class="consent"><input type="checkbox" required checked /> Я согласен с политикой конфиденциальности</label><label class="consent"><input type="checkbox" required checked /> Я согласен с пользовательским соглашением</label></fieldset>
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
      <img src="${productImages[0].source}" alt="CEOMENTALITY Access" />
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
