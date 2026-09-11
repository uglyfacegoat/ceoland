import {
  button,
  header,
  icon,
  legalLinks,
  logo,
  objectImage,
  textLink,
} from "./ui.ts";
import { productSection } from "./product.ts";
import { dropSection } from "./drop.ts";
import { collectionProducts, product } from "./catalog.ts";

export function landing(): string {
  return `<div class="landing">${header("landing")}
    <main id="main" tabindex="-1">
      <section class="hero" aria-labelledby="hero-title">
        <img class="hero-barcode" src="/images/barcode-navy.svg" width="381" height="59" alt="" aria-hidden="true" />
        <h1 id="hero-title" class="access-title">access<span>.</span><span class="sr-only"> ceowallet — картхолдер CEOMENTALITY</span></h1>
        <div class="hero-object">${objectImage("angle", "", true)}</div>
        <h2>Знакомый знак.<br>Свой круг.</h2>
        <p class="hero-copy">Картхолдер ceowallet.<br>Покупка — по персональному коду.</p>
        <div class="hero-cta">${button("Выбрать картхолдер", "/#product")}${textLink("У меня есть код", "/access")}<a class="hero-down icon-button" href="/#idea" aria-label="К следующему разделу">↓</a></div>
        <div class="hero-bottom"><div class="eyebrow"><span>ЛЮДИ</span><span>ТЕХНОЛОГИИ</span><span>ВОЗМОЖНОСТИ</span><span>РЕЗУЛЬТАТ</span></div><a href="/#idea">Знакомимся ближе ↓</a></div>
      </section>
      <section class="character inset-panel" id="idea" aria-labelledby="character-title">
        <div class="character-backdrop" aria-hidden="true"><span>CEO</span><span>MENT</span><span>ALITY</span></div>
        <h2 id="character-title">Не напоказ.<br>Для своих.</h2>
        ${objectImage("angle", "character-angle")}${objectImage("front", "character-front")}
        <p>Начинаем с предмета, который<br>остаётся рядом каждый день.<span>Форму видно сразу. Смысл — не всем.</span></p>
      </section>
      <section class="construction" aria-labelledby="construction-title">
        <div class="construction-scene">
        <h2 id="construction-title">ничего<br>лишнего.</h2>
        <p class="construction-desktop">Два кармана на лицевой стороне.<br>Сзади — ровная поверхность.<br>Без отделения посередине.</p>
        ${objectImage("front", "construction-front")}${objectImage("back", "construction-back")}
        <figure class="material-detail detail-stitch" aria-label="Увеличенный фрагмент шва">
          <div class="detail-crop"><img src="/images/detail-stitch.webp" width="1254" height="1254" alt="Стежки по скруглённому краю картхолдера" loading="lazy" /></div>
          <img class="detail-line" src="/images/detail-line-stitch.svg" alt="" aria-hidden="true" />
          <img class="detail-dot" src="/images/detail-dot.svg" width="9" height="9" alt="" aria-hidden="true" />
        </figure>
        <figure class="material-detail detail-leather" aria-label="Увеличенный фрагмент кожи">
          <div class="detail-crop"><img src="/images/detail-leather.webp" width="1254" height="1254" alt="Мелкозернистая фактура белой кожи" loading="lazy" /></div>
          <img class="detail-line" src="/images/detail-line-leather.svg" alt="" aria-hidden="true" />
          <img class="detail-dot" src="/images/detail-dot.svg" width="9" height="9" alt="" aria-hidden="true" />
        </figure>
        <a class="detail-marker icon-button" href="/#product" aria-label="Посмотреть картхолдер подробнее">${icon("plus")}</a>
        </div>
        <p class="construction-mobile">Карманы только спереди.<br>Без отделения посередине.</p>
      </section>
      <section class="invitation inset-panel" id="access" aria-labelledby="invitation-title">
        <div class="invitation-backdrop" aria-hidden="true">ACCESS</div>
        <img class="invitation-barcode" src="/images/barcode-white.svg" width="564" height="59" loading="lazy" alt="" aria-hidden="true" />
        <h2 id="invitation-title">Только<br>по коду.</h2>
        <div class="invitation-visual"><img class="membership-card" src="/images/membership-card.webp" width="1000" height="583" alt="MEMBERSHIP CONFIRMED. Welcome to #CEOCOMMUNITY. This card connects you to people like you." loading="lazy" /></div>
        <p class="invitation-copy">Код — не скидка.<br class="mobile-only"> Это приглашение к покупке.<span>Проверим его при оформлении заказа.</span></p>
        <div class="invitation-cta">${button("У меня есть код", "/access", "button-light")}${textLink("Нет кода? Оставить заявку", "/request")}</div>
      </section>
      ${productSection()}
      ${dropSection()}
    </main>
    <footer class="site-footer"><div class="footer-inner">
      <p class="eyebrow">ПРОДОЛЖЕНИЕ СЛЕДУЕТ</p>
      <h2>Тот же характер.<br>Другие вещи.</h2>
      <div class="collection-types" role="group" aria-label="Будущая коллекция">
        ${collectionProducts
          .filter((entry) => entry.availability === "coming-soon")
          .map(
            (entry) =>
              `<button class="collection-type" data-product-select="${entry.id}" aria-pressed="false" aria-controls="product" aria-describedby="collection-note">${entry.category}</button>`,
          )
          .join("")}
      </div>
      <div class="collection-caption"><p class="future-note" id="collection-note" role="status">Будущая коллекция. Предметы пока не в продаже.</p><button class="collection-return" data-product-select="${product.id}" aria-controls="product" hidden>Вернуться к картхолдеру ${icon("arrow")}</button></div>
      <div class="footer-brand">${logo()}<nav aria-label="О компании"><a href="/info/contacts">Контакты</a><a href="/info/company">Реквизиты</a></nav></div>
      <nav class="footer-legal" aria-label="Правовая информация">${legalLinks()}</nav>
      <div class="footer-bottom"><p>© CEOMENTALITY 2026</p><p>CEOMENTALITY / ACCESS</p></div>
    </div></footer>
  </div>`;
}
