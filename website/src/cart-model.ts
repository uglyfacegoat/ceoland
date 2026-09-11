import { product, walletVariant, type WalletVariantId } from "./catalog.ts";

export interface CartLine {
  readonly variantId: WalletVariantId;
  readonly quantity: number;
}

// Frontend limit; the server must validate actual stock and the final quote.
export const MAX_QUANTITY = 99;
export function isQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_QUANTITY
  );
}
export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}
export function cartSubtotal(lines: readonly CartLine[]): number {
  return cartCount(lines) * product.priceMinor;
}
export function parseCart(serialized: string | null): readonly CartLine[] {
  if (serialized === null) return [];
  const saved: unknown = JSON.parse(serialized);
  if (typeof saved !== "object" || saved === null || !("version" in saved))
    throw new Error("Некорректная сохранённая корзина");
  // Existing v1 carts contained only the white wallet.
  if (saved.version === 1 && "quantity" in saved && isQuantity(saved.quantity))
    return saved.quantity
      ? [{ variantId: "ceowallet-white", quantity: saved.quantity }]
      : [];
  if (saved.version !== 2 || !("items" in saved) || !Array.isArray(saved.items))
    throw new Error("Неизвестный формат корзины");
  const seen = new Set<string>();
  const lines = saved.items.map((entry: unknown): CartLine => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("variantId" in entry) ||
      typeof entry.variantId !== "string" ||
      !("quantity" in entry) ||
      !isQuantity(entry.quantity) ||
      entry.quantity === 0 ||
      seen.has(entry.variantId)
    )
      throw new Error("Некорректная позиция корзины");
    const variant = walletVariant(entry.variantId);
    seen.add(variant.id);
    return { variantId: variant.id, quantity: entry.quantity };
  });
  if (cartCount(lines) > MAX_QUANTITY)
    throw new RangeError("В корзине может быть до 99 предметов");
  return lines;
}
export function updateCartLine(
  lines: readonly CartLine[],
  variantId: string,
  quantity: number,
): readonly CartLine[] {
  const variant = walletVariant(variantId);
  if (!isQuantity(quantity))
    throw new RangeError("Можно выбрать от 0 до 99 предметов");
  const next = lines.filter((line) => line.variantId !== variant.id);
  if (quantity) next.push({ variantId: variant.id, quantity });
  next.sort((a, b) => a.variantId.localeCompare(b.variantId));
  if (cartCount(next) > MAX_QUANTITY)
    throw new RangeError("В корзине может быть до 99 предметов");
  return next;
}
