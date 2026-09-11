import { getCart } from "./cart.ts";
import {
  walletVariants,
  type ProductPhoto,
  type WalletVariant,
} from "./catalog.ts";
import { cartCount } from "./cart-model.ts";

export function icon(
  name: "arrow" | "bag" | "menu" | "plus" | "minus",
  extra = "",
): string {
  return `<span class="icon icon-${name} ${extra}" aria-hidden="true"></span>`;
}

export function logo(extra = ""): string {
  return `<a class="wordmark ${extra}" href="/" aria-label="CEOMENTALITY — на главную"><img src="/images/wordmark.svg" alt="CEOMENTALITY" width="223" height="15" /></a>`;
}

export function header(
  variant: "landing" | "close" | "dark" = "close",
): string {
  return `<header class="site-header ${variant === "dark" ? "dark-header" : ""}">
    ${logo()}
    ${
      variant === "landing"
        ? `<nav class="desktop-nav" aria-label="Главная навигация"><a href="/#idea">Идея</a><a href="/#product">Картхолдер</a><a href="/#access">Доступ</a></nav>
      <div class="header-actions"><a class="menu-trigger icon-button" href="/menu" aria-label="Открыть меню">${icon("menu")}</a>
      <a class="cart-link" href="/cart" aria-label="Корзина"><span class="cart-count">Корзина (${cartCount(getCart())})</span>${icon("bag")}<span class="mobile-count ${cartCount(getCart()) ? "" : "is-hidden"}" aria-hidden="true">${cartCount(getCart())}</span></a></div>`
        : `<a class="icon-button close" href="/" aria-label="Закрыть и вернуться на главную">×</a>`
    }
  </header>`;
}

export function button(label: string, href: string, extra = ""): string {
  return `<a class="button ${extra}" href="${href}">${label}${icon("arrow")}</a>`;
}

export function textLink(label: string, href: string, extra = ""): string {
  return `<a class="text-link ${extra}" href="${href}">${label}${icon("arrow")}</a>`;
}

export function objectImage(
  view: string,
  extra = "",
  eager = false,
  variant: WalletVariant = walletVariants[0],
): string {
  const photo = variant.views.find((entry) => entry.id === view);
  if (!photo) throw new Error("Unknown product view");
  return productImage(
    photo,
    `object-${view} wallet-${variant.color} ${extra}`,
    eager,
  );
}

export function productImage(
  photo: ProductPhoto,
  extra = "",
  eager = false,
): string {
  const crop = photo.crop ?? {
    x: 0,
    y: 0,
    width: photo.width,
    height: photo.height,
  };
  return `<span class="object-image ${extra}" style="--photo-aspect:${crop.width / crop.height}"><img src="${photo.image}" alt="${photo.alt}" width="${photo.width}" height="${photo.height}" loading="${eager ? "eager" : "lazy"}" ${eager ? 'fetchpriority="high"' : ""} draggable="false" style="width:${(photo.width / crop.width) * 100}%;left:${(-crop.x / crop.width) * 100}%;top:${(-crop.y / crop.height) * 100}%" /></span>`;
}

export function quantityControl(
  quantity: number,
  context: string,
  variantId?: string,
): string {
  return `<div class="quantity" role="group" aria-label="Количество">
    <button class="icon-button" data-quantity="${context}" ${variantId ? `data-variant-id="${variantId}"` : ""} data-delta="-1" aria-label="Уменьшить количество" ${quantity <= 1 ? "disabled" : ""}>${icon("minus")}</button>
    <output aria-live="polite" aria-label="Количество предметов">${quantity}</output>
    <button class="icon-button" data-quantity="${context}" ${variantId ? `data-variant-id="${variantId}"` : ""} data-delta="1" aria-label="Увеличить количество" ${quantity >= 99 ? "disabled" : ""}>${icon("plus")}</button>
  </div>`;
}

export function legalLinks(): string {
  return `<a href="/info/privacy">Политика конфиденциальности</a><a href="/info/terms">Пользовательское соглашение</a><a href="/info/purchase">Условия покупки</a>`;
}

export function compactFooter(): string {
  return `<footer class="compact-footer">${logo()}<nav aria-label="Правовая информация">${legalLinks()}<a href="/info/company">Реквизиты</a></nav></footer>`;
}

export function announce(message: string): void {
  const region = document.querySelector("#announcement");
  if (region) region.textContent = message;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить действие. Попробуйте ещё раз.";
}
