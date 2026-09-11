export const product = {
  id: "ceowallet",
  name: "ceowallet",
  priceMinor: 299_000,
  currency: "RUB",
} as const;

export interface ProductPhoto {
  id: string;
  image: string;
  alt: string;
  width: number;
  height: number;
  crop?: { x: number; y: number; width: number; height: number };
}

export const walletVariants = [
  {
    id: "ceowallet-white",
    color: "white",
    label: "Белый",
    swatch: "#fff",
    views: [
      {
        id: "angle",
        image: "/images/wallet-white-angle.webp",
        alt: "Белый ceowallet — вид под углом",
        width: 1254,
        height: 1254,
        crop: { x: 160, y: 211, width: 943, height: 876 },
      },
      {
        id: "back",
        image: "/images/wallet-white-back.webp",
        alt: "Белый ceowallet — оборотная сторона",
        width: 1254,
        height: 1254,
        crop: { x: 136, y: 305, width: 985, height: 676 },
      },
      {
        id: "front",
        image: "/images/wallet-white-front.webp",
        alt: "Белый ceowallet — два кармана спереди",
        width: 1254,
        height: 1254,
        crop: { x: 112, y: 290, width: 1030, height: 713 },
      },
      {
        id: "side",
        image: "/images/wallet-white-side.webp",
        alt: "Белый ceowallet — боковой ракурс",
        width: 1254,
        height: 1254,
        crop: { x: 163, y: 145, width: 943, height: 1008 },
      },
    ],
  },
  {
    id: "ceowallet-black",
    color: "black",
    label: "Чёрный",
    swatch: "#171719",
    views: [
      {
        id: "front",
        image: "/images/wallet-black-front.webp",
        alt: "Чёрный ceowallet с белой надписью — вид спереди",
        width: 1254,
        height: 1254,
        crop: { x: 142, y: 267, width: 974, height: 722 },
      },
    ],
  },
] as const;
export type WalletVariant = (typeof walletVariants)[number];
export type WalletVariantId = WalletVariant["id"];

export function walletVariant(id: string): WalletVariant {
  const variant = walletVariants.find((variant) => variant.id === id);
  if (!variant) throw new Error("Неизвестный вариант ceowallet");
  return variant;
}

export const collectionProducts = [
  {
    ...product,
    shortName: "ceowallet",
    category: "Картхолдер",
    variant: "Картхолдер",
    availability: "available",
    views: walletVariants[0].views,
    description: [
      "Два кармана на лицевой стороне. Сзади — ровная поверхность. Без отделения посередине.",
      "Два цвета: белый с тёмно-синей надписью и чёрный с белой. Покупка — по персональному приглашению.",
      "Условия доставки уточняются при оформлении заказа.",
    ],
  },
  {
    id: "ceomentality-hoodie",
    name: "CEOMENTALITY Hoodie",
    shortName: "Hoodie",
    category: "Худи",
    variant: "Худи · чёрный",
    availability: "coming-soon",
    views: [
      {
        id: "front",
        image: "/images/collection-hoodie.webp",
        alt: "Концепт чёрного худи CEOMENTALITY",
        width: 1254,
        height: 1254,
      },
    ],
    description: [
      "Тот же характер — в новом силуэте. Худи с лаконичной надписью CEOMENTALITY.",
      "Концепт будущей коллекции. Итоговый дизайн, состав, размеры и цена будут объявлены к выпуску.",
    ],
  },
  {
    id: "ceomentality-cap",
    name: "CEOMENTALITY Cap",
    shortName: "Cap",
    category: "Кепка",
    variant: "Кепка · чёрный",
    availability: "coming-soon",
    views: [
      {
        id: "front",
        image: "/images/collection-cap.webp",
        alt: "Концепт чёрной кепки CEOMENTALITY",
        width: 1254,
        height: 1254,
      },
    ],
    description: [
      "Знакомый знак. Ещё одна личная вещь. Кепка с небольшим логотипом CEOMENTALITY.",
      "Концепт будущей коллекции. Итоговый дизайн, размеры и цена будут объявлены к выпуску.",
    ],
  },
  {
    id: "ceomentality-tshirt",
    name: "CEOMENTALITY T-shirt",
    shortName: "T-shirt",
    category: "Футболка",
    variant: "Футболка · белый / тёмно-синий",
    availability: "coming-soon",
    views: [
      {
        id: "front",
        image: "/images/collection-tshirt.webp",
        alt: "Концепт белой футболки CEOMENTALITY",
        width: 1254,
        height: 1254,
      },
    ],
    description: [
      "Ничего лишнего. Белая футболка с тёмно-синим знаком CEOMENTALITY.",
      "Концепт будущей коллекции. Итоговый дизайн, состав, размеры и цена будут объявлены к выпуску.",
    ],
  },
] as const;

export type CollectionProduct = (typeof collectionProducts)[number];

export function formatMoney(minor: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
