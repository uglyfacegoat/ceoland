import { formatMoney, product } from "./catalog.ts";
const price = formatMoney(product.priceMinor);

export const pageMetadata: Record<
  string,
  { title: string; description: string; indexable: boolean }
> = {
  "/": {
    title: `ceowallet — картхолдер CEOMENTALITY за ${price}`,
    description:
      "ceowallet от CEOMENTALITY. Белый или чёрный картхолдер с двумя карманами спереди. Личные вещи, свой круг. Покупка по персональному приглашению.",
    indexable: true,
  },
  "/product": {
    title: "ceowallet — белый и чёрный картхолдер | CEOMENTALITY",
    description: `Выберите белый или чёрный ceowallet за ${price}. Фотографии, детали и выбор цвета. Для покупки картхолдера понадобится персональный код доступа.`,
    indexable: true,
  },
  "/access": {
    title: "Код доступа | CEOMENTALITY",
    description: "Проверка персонального приглашения перед покупкой ceowallet.",
    indexable: false,
  },
  "/access/accepted": {
    title: "Код принят | CEOMENTALITY",
    description: "Подтверждение персонального приглашения.",
    indexable: false,
  },
  "/request": {
    title: "Запрос приглашения | CEOMENTALITY",
    description: "Оставьте заявку на персональное приглашение в CEOMENTALITY.",
    indexable: false,
  },
  "/request/sent": {
    title: "Заявка | CEOMENTALITY",
    description: "Статус заявки на персональное приглашение.",
    indexable: false,
  },
  "/cart": {
    title: "Корзина | CEOMENTALITY",
    description: "Ваши ceowallet: выбранные цвета, количество и сумма заказа.",
    indexable: false,
  },
  "/checkout": {
    title: "Оформление заказа | CEOMENTALITY",
    description:
      "Контактные данные, получение и код доступа для оформления ceowallet.",
    indexable: false,
  },
  "/menu": {
    title: "Навигация | CEOMENTALITY",
    description: "Идея, ceowallet и персональный доступ.",
    indexable: false,
  },
  "/preview": {
    title: "Просмотр интерфейса | CEOMENTALITY",
    description: "Служебный каталог экранов для проверки фронтенда.",
    indexable: false,
  },
  "/info/privacy": {
    title: "Политика конфиденциальности | CEOMENTALITY",
    description: "Информация об обработке персональных данных.",
    indexable: false,
  },
  "/info/terms": {
    title: "Пользовательское соглашение | CEOMENTALITY",
    description: "Условия использования сайта CEOMENTALITY.",
    indexable: false,
  },
  "/info/purchase": {
    title: "Условия покупки | CEOMENTALITY",
    description: "Информация об условиях приобретения товаров.",
    indexable: false,
  },
  "/info/company": {
    title: "Реквизиты | CEOMENTALITY",
    description: "Информация о продавце CEOMENTALITY.",
    indexable: false,
  },
  "/info/contacts": {
    title: "Контакты | CEOMENTALITY",
    description: "Контактная информация CEOMENTALITY.",
    indexable: false,
  },
};
export function siteOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(
      "VITE_SITE_URL должен содержать только HTTPS-домен без пути, параметров и пароля",
    );
  return url.origin;
}
function escapeAttribute(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}
export function seoHead(path: string, origin: string | null): string {
  const metadata = pageMetadata[path] ?? {
    title: "Страница не найдена | CEOMENTALITY",
    description: "Запрошенная страница не найдена.",
    indexable: false,
  };
  const title = escapeAttribute(metadata.title);
  const description = escapeAttribute(metadata.description);
  const canonical = origin ? escapeAttribute(origin + path) : null;
  return `<title data-seo>${title}</title>
<meta data-seo name="description" content="${description}">
<meta data-seo name="robots" content="${origin && metadata.indexable ? "index, follow" : "noindex, follow"}">
<meta data-seo property="og:type" content="website">
<meta data-seo property="og:locale" content="ru_RU">
<meta data-seo property="og:site_name" content="CEOMENTALITY">
<meta data-seo property="og:title" content="${title}">
<meta data-seo property="og:description" content="${description}">
<meta data-seo name="twitter:card" content="summary_large_image">
<meta data-seo name="twitter:title" content="${title}">
<meta data-seo name="twitter:description" content="${description}">
${
  canonical
    ? `<link data-seo rel="canonical" href="${canonical}">
<meta data-seo property="og:url" content="${canonical}">
<meta data-seo property="og:image" content="${origin}/images/og-ceowallet.png">
<meta data-seo property="og:image:width" content="1200">
<meta data-seo property="og:image:height" content="630">
<meta data-seo property="og:image:alt" content="ceowallet — картхолдер CEOMENTALITY">
<meta data-seo name="twitter:image" content="${origin}/images/og-ceowallet.png">`
    : ""
}`;
}
export function sitemapXml(origin: string | null): string {
  const urls = origin
    ? Object.entries(pageMetadata)
        .filter(([, meta]) => meta.indexable)
        .map(
          ([path]) => `<url><loc>${escapeAttribute(origin + path)}</loc></url>`,
        )
        .join("\n")
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
export function robotsTxt(origin: string | null): string {
  return origin
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
}
