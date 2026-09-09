export const ACCESS_PRICE = 29_990;
const CART_STORAGE_KEY = "ceomentality-cart-v1";

export function formatRubles(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

export function getQuantity() {
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (stored === null) return 0;

  const quantity = Number(stored);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9) {
    localStorage.removeItem(CART_STORAGE_KEY);
    return 0;
  }
  return quantity;
}

export function setQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9) {
    throw new RangeError("Cart quantity must be an integer between 0 and 9.");
  }
  localStorage.setItem(CART_STORAGE_KEY, String(quantity));
  window.dispatchEvent(new CustomEvent("cartchange", { detail: quantity }));
}

export function updateCartBadges(quantity = getQuantity()) {
  document.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((badge) => {
    badge.textContent = String(quantity);
  });
  document.querySelectorAll<HTMLAnchorElement>(".bag").forEach((link) => {
    link.setAttribute("aria-label", `Корзина, товаров: ${quantity}`);
  });
}
