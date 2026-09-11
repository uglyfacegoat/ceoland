import { parseCart, updateCartLine, type CartLine } from "./cart-model.ts";

const storageKey = "ceomentality.cart";
const legacyStorageKey = "ceomentality.cart.v1";
let items: readonly CartLine[] = [];
let storageError: string | null = null;

function readStorage(): void {
  try {
    const current = localStorage.getItem(storageKey);
    const legacy =
      current === null ? localStorage.getItem(legacyStorageKey) : null;
    const restored = parseCart(current ?? legacy);
    if (legacy !== null) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: 2, items: restored }),
      );
      localStorage.removeItem(legacyStorageKey);
    }
    items = restored;
    storageError = null;
  } catch {
    storageError =
      "Не удалось прочитать сохранённую корзину. Сбросьте её перед продолжением.";
  }
}
export function initializeCart(): void {
  readStorage();
  window.addEventListener("storage", (event) => {
    if (
      event.key !== storageKey &&
      event.key !== legacyStorageKey &&
      event.key !== null
    )
      return;
    readStorage();
    window.dispatchEvent(new Event("cartchange"));
  });
}
export function getCart(): readonly CartLine[] {
  return items;
}
export function getCartError(): string | null {
  return storageError;
}

export function setCartQuantity(variantId: string, quantity: number): void {
  if (storageError) throw new Error(storageError);
  const next = updateCartLine(items, variantId, quantity);
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: 2, items: next }),
    );
  } catch {
    throw new Error(
      "Браузер не разрешил сохранить корзину. Проверьте настройки хранилища.",
    );
  }
  items = next;
  window.dispatchEvent(new Event("cartchange"));
}
export function addToCart(variantId: string, quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new RangeError("Недопустимое количество");
  const existing = items.find((line) => line.variantId === variantId);
  setCartQuantity(variantId, (existing?.quantity ?? 0) + quantity);
}
export function resetCart(): void {
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
  } catch {
    throw new Error(
      "Не удалось очистить корзину. Проверьте настройки браузера.",
    );
  }
  items = [];
  storageError = null;
  window.dispatchEvent(new Event("cartchange"));
}
