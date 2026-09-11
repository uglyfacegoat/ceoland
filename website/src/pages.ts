import { getCart, getCartError } from "./cart.ts";
import { formatMoney, product, walletVariant } from "./catalog.ts";
import {
  button,
  compactFooter,
  header,
  icon,
  logo,
  objectImage,
  quantityControl,
  textLink,
} from "./ui.ts";
import { cartCount, cartSubtotal, type CartLine } from "./cart-model.ts";
import { productSection } from "./product.ts";

export function menuPage(): string {
  return `<div class="menu-page">${header("dark")}<main id="main" tabindex="-1"><h1 class="eyebrow">CEOMENTALITY / НАВИГАЦИЯ</h1><nav aria-label="Меню">${[
    ["Идея", "/#idea"],
    ["Картхолдер", "/#product"],
    ["Доступ", "/#access"],
    ["Корзина", "/cart"],
  ]
    .map(([label, href]) => `<a href="${href}">${label}</a>`)
    .join(
      "",
    )}</nav><p class="menu-caption">Личные вещи. Свой круг.</p></main></div>`;
}

export function accessPage(state: string | null): string {
  return `<div class="page-shell">${header()}<main id="main" class="access-page narrow-page" tabindex="-1">
    <p class="eyebrow">ЛИЧНЫЙ ДОСТУП</p><h1>Ваш код.</h1><p class="access-intro">Проверим приглашение<br>перед покупкой.</p>
    <form novalidate inert id="access-form"><label class="field">Код доступа<input name="accessCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="64" placeholder="CM-DEMO-2026" required aria-describedby="access-note access-message" ${state === "invalid" ? 'aria-invalid="true"' : ""}></label>
      <p class="preview-note" id="access-note">Демо-код для просмотра: <button type="button" class="fill-demo">CM-DEMO-2026</button>.</p>
      <p id="access-message" class="form-message error" role="alert" ${state === "invalid" ? "" : "hidden"}>Код недействителен или уже использован.</p>
      <button class="button" type="submit">Проверить код${icon("arrow")}</button>
    </form>${textLink("Нет кода? Оставить заявку", "/request")}
  </main></div>`;
}

export function acceptedPage(): string {
  return `<div class="page-shell">${header()}<main id="main" class="accepted-page narrow-page" tabindex="-1"><p class="eyebrow">КОД ПРИНЯТ</p><h1>Вы внутри.</h1><p class="access-intro">Приглашение подходит.<br>Можно продолжить оформление.</p>${objectImage("front", "", true)}${button("Выбрать картхолдер", "/#product")}<p class="preview-note">Состояние интерфейса. Проверка кода<br>в готовом сайте выполняется на сервере.</p></main></div>`;
}

export function productPage(): string {
  return `<div class="page-shell">${header()}<main id="main" tabindex="-1">${productSection(true)}</main></div>`;
}

export function emptyCartPage(): string {
  return `<div class="page-shell">${header()}<main id="main" class="empty-page narrow-page" tabindex="-1"><h1>Пока пусто.</h1><p>Первый предмет ждёт<br>в коллекции.</p>${button("К картхолдеру", "/#product")}</main></div>`;
}

export function cartPage(): string {
  const storageError = getCartError();
  if (storageError)
    return `<div class="page-shell">${header()}<main id="main" class="narrow-page storage-page" tabindex="-1"><h1>Корзина</h1><p>Не удалось прочитать сохранённую корзину. Сбросьте её перед продолжением.</p><button class="button" data-reset-cart>Сбросить корзину${icon("arrow")}</button><p class="form-message error" role="alert" hidden></p></main></div>`;
  const items = getCart();
  const quantity = cartCount(items);
  if (quantity === 0) return emptyCartPage();
  return `<div class="page-shell commerce-shell">${header()}<main id="main" class="cart-page" tabindex="-1"><h1>Корзина</h1><p class="eyebrow cart-eyebrow">CEOWALLET / КОЛЛЕКЦИЯ</p>
    <div class="cart-layout"><div class="cart-item-area">${items
      .map((line) => {
        const variant = walletVariant(line.variantId);
        return `<article class="cart-item" data-cart-variant="${variant.id}">${objectImage("front", "cart-photo", true, variant)}<h2>${product.name}</h2><p class="variant">${variant.label}</p><p class="cart-item-price">${formatMoney(line.quantity * product.priceMinor)}</p><div class="cart-quantity">${quantityControl(line.quantity, "cart", variant.id)}</div><button class="remove-item" data-remove-item data-variant-id="${variant.id}" aria-label="Удалить ceowallet, ${variant.label.toLowerCase()}">Удалить</button></article>`;
      })
      .join(
        "",
      )}<a class="continue-shopping" href="/#product">← Продолжить покупки</a></div>
    <aside class="cart-summary"><h2>Твой заказ</h2><div class="cart-summary-items"><span>Товары, ${quantity} шт.</span><strong>${formatMoney(cartSubtotal(items))}</strong></div><p class="delivery-note"><span class="delivery-label">Доставка</span><span>Доставка рассчитывается<br>при оформлении.</span></p><div class="subtotal"><span>Подытог</span><strong>${formatMoney(cartSubtotal(items))}</strong></div>${button("К оформлению", "/checkout")}<p class="preview-note">Для оплаты нужен действующий код.<span>Проверим его на следующем шаге.</span></p></aside></div>
    <p class="cart-error form-message error" role="alert" hidden></p>
  </main>${compactFooter()}</div>`;
}

function field(
  name: string,
  label: string,
  placeholder: string,
  type = "text",
  extra = "",
): string {
  const autocomplete: Record<string, string> = {
    name: "name",
    email: "email",
    phone: "tel",
    city: "address-level2",
    address: "street-address",
    accessCode: "off",
  };
  return `<label class="field field-${name}">${label}<input name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete[name]}" ${type === "tel" ? 'inputmode="tel"' : ""} maxlength="${name === "address" ? "300" : name === "accessCode" ? "64" : "120"}" ${extra}></label>`;
}

export function requestPage(): string {
  return `<div class="request-page"><aside class="request-aside">${logo()}<p class="invitation-word">by<br>invitation.</p><p>По приглашению. Без лишних слов.</p></aside><div class="request-panel">${header()}<main id="main" tabindex="-1"><p class="eyebrow"><span class="request-mobile-word">ЗАЯВКА НА ПОКУПКУ</span><span class="request-desktop-word">ПЕРСОНАЛЬНОЕ ПРИГЛАШЕНИЕ</span></p><h1>Начнём<span class="request-mobile-word"> со</span><br><span class="request-desktop-word">со </span>знакомства.</h1><p class="request-intro">Оставьте контакты. Свяжемся с вами<br>и расскажем о покупке.</p><form novalidate inert id="request-form">
    <div class="request-fields">${field("name", "Имя", "Как к вам обращаться", "text", 'required minlength="2"')}${field("email", "Email", "name@example.com", "email", "required")}${field("phone", "Телефон", "+7 …", "tel", 'required minlength="7"')}${field("accessCode", "Код доступа, если есть", "Необязательно")}</div>
    <label class="consent"><input name="privacy" type="checkbox" required><span>Согласен на обработку персональных данных и ознакомлен с <a href="/info/privacy" target="_blank" rel="noopener">политикой</a>.</span></label>
    <p class="form-message error" role="alert" hidden></p><button class="button" type="submit">Отправить заявку${icon("arrow")}</button><p class="preview-note">Демо: данные не отправляются и не сохраняются.</p>
  </form></main></div></div>`;
}

export function requestSentPage(): string {
  return `<div class="sent-page">${header("dark")}<main id="main" class="narrow-page" tabindex="-1"><p class="eyebrow">ЗАЯВКА ОТПРАВЛЕНА</p><h1>Принято.<br>На связи.</h1><p class="sent-copy">Ваши контакты переданы команде.<br>Вернёмся с ответом.</p><p class="preview-note">Демонстрация экрана подтверждения.<br>Заявка не отправлялась.</p>${button("На главную", "/", "button-light")}</main></div>`;
}

export function checkoutItems(items: readonly CartLine[]): string {
  return items
    .map((line) => {
      const variant = walletVariant(line.variantId);
      return `<div class="checkout-item">${objectImage("front", "", true, variant)}<p><strong>${product.name}</strong><span>${variant.label} · ${line.quantity} шт.</span></p></div>`;
    })
    .join("");
}

export function checkoutPage(preview = false): string {
  if (getCartError()) return cartPage();
  const items: readonly CartLine[] = preview
    ? [{ variantId: "ceowallet-white", quantity: 1 }]
    : getCart();
  const quantity = cartCount(items);
  if (!quantity) return emptyCartPage();
  return `<div class="page-shell commerce-shell">${header()}<main id="main" class="checkout-page" tabindex="-1"><h1>Оформление</h1><p class="eyebrow">КОНТАКТЫ / ПОЛУЧЕНИЕ / ОПЛАТА</p><form novalidate inert id="checkout-form" data-preview="${preview}"><div class="checkout-layout">
    <div class="customer-fields">${field("name", "Имя", "Как к вам обращаться", "text", 'required minlength="2"')}${field("email", "Email", "name@example.com", "email", "required")}${field("phone", "Телефон", "+7 …", "tel", 'required minlength="7"')}${field("city", "Город", "Город доставки")}${field("address", "Адрес получения", "Город, улица, дом, квартира", "text", 'required minlength="5"')}</div>
    <div class="checkout-product"><h2>В заказе</h2><div class="checkout-items">${checkoutItems(items)}</div></div>
    <div class="checkout-code">${field("accessCode", "Код доступа", "Введите ваш код", "text", 'required aria-describedby="checkout-code-message"')}<button class="check-checkout-code text-link" type="button">Проверить код${icon("arrow")}</button><div class="checkout-code-status"><p class="form-message" id="checkout-code-message" role="status" hidden></p></div></div>
    <div class="checkout-total"><span class="checkout-total-label">Итого</span><strong data-order-total>${formatMoney(cartSubtotal(items))}</strong></div>
    <fieldset class="consents"><legend class="sr-only">Согласия</legend>${[
      ["privacy", "Согласие на обработку данных", "privacy"],
      ["terms", "Пользовательское соглашение", "terms"],
      ["purchase", "Условия покупки", "purchase"],
    ]
      .map(
        ([name, label, page]) =>
          `<label class="consent"><input type="checkbox" name="${name}" required><a href="/info/${page}" target="_blank" rel="noopener">${label}</a></label>`,
      )
      .join("")}</fieldset>
    <div class="checkout-payment"><button class="button" type="submit">Перейти к оплате${icon("arrow")}</button><p class="preview-note">Оплата станет доступна после проверки<br>данных, кода и подтверждения согласий.</p><p class="preview-note demo-payment-note">Демо-код: CM-DEMO-2026. Оплата не подключена.</p><p class="form-message error" role="alert" hidden></p></div>
  </div></form></main></div>`;
}

const infoTitles: Record<string, string> = {
  privacy: "Политика конфиденциальности",
  terms: "Пользовательское соглашение",
  purchase: "Условия покупки",
  company: "Реквизиты",
  contacts: "Контакты",
};
export function infoPage(slug: string): string {
  const title = Object.hasOwn(infoTitles, slug) ? infoTitles[slug] : undefined;
  if (!title) return notFoundPage();
  return `<div class="page-shell">${header()}<main id="main" class="info-page narrow-page" tabindex="-1"><p class="eyebrow">CEOMENTALITY / ИНФОРМАЦИЯ</p><h1>${title}</h1><p>Раздел подготовлен для материалов заказчика. Текст и реквизиты будут добавлены перед запуском.</p>${button("На главную", "/")}</main></div>`;
}

export function previewPage(): string {
  const screens = [
    ["Лендинг", "/"],
    ["Меню", "/menu"],
    ["Ввод кода", "/access"],
    ["Неверный код", "/access?state=invalid"],
    ["Код принят", "/access/accepted"],
    ["Картхолдер под углом", "/product"],
    ["Оборотная сторона", "/product?view=back"],
    ["Вид спереди", "/product?view=front"],
    ["Корзина", "/cart"],
    ["Пустая корзина", "/cart?state=empty"],
    ["Оформление", "/checkout?preview=filled"],
    ["Заявка", "/request"],
    ["Подтверждение заявки", "/request/sent"],
  ];
  return `<div class="page-shell">${header()}<main id="main" class="preview-page narrow-page" tabindex="-1"><p class="eyebrow">FRONTEND / FIGMA 143:908</p><h1>Все экраны.</h1><p>Для проверки кода используйте CM-DEMO-2026. Заявки и оплата работают только как демонстрация интерфейса.</p><nav aria-label="Экраны прототипа">${screens.map(([label, href]) => textLink(label!, href!)).join("")}</nav></main></div>`;
}

export function notFoundPage(): string {
  return `<div class="page-shell">${header()}<main id="main" class="info-page narrow-page" tabindex="-1"><p class="eyebrow">404</p><h1>Здесь пусто.</h1><p>Такой страницы нет.</p>${button("На главную", "/")}</main></div>`;
}
