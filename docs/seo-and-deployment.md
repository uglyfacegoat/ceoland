# SEO и публикация

## Что подготовлено

- Уникальные title и description в `website/src/seo.ts`.
- Семантические main/header/nav/section/footer, один H1 на страницу, H2/H3 для разделов.
- Понятные маршруты `/product`, `/request`, `/access`, `/cart`, `/checkout`.
- Open Graph и Twitter Card, отдельное изображение 1200×630, SVG-favicon из первой буквы фирменного логотипа.
- Локальные шрифты с font-display: swap, размеры изображений и отложенная загрузка следующих разделов.
- Пререндер: `scripts/build.mjs` использует тот же `renderRoute`, что и клиент. Основной текст, ссылки и метаданные находятся уже в HTML, даже без JavaScript.
- Генерация `dist/sitemap.xml` и `dist/robots.txt` из той же конфигурации маршрутов.

## Пока нет домена

Заказчик пока не выбрал домен. `npm run build` без `VITE_SITE_URL` создаёт сборку для просмотра: noindex в HTML, запрет обхода в robots.txt, пустой корректный sitemap. Canonical и абсолютные URL соцпревью не выдумываются.

Перед публикацией:

1. Скопировать `.env.example` в `.env.production`.
2. Заполнить `VITE_SITE_URL` настоящим HTTPS-origin: только схема и домен, без пути, query/hash, логина и пароля.
3. Выполнить `npm run build:release`. Команда остановится, если домен не указан или некорректен.
4. Опубликовать содержимое `website/dist`.
5. Проверить title, canonical, OG, favicon, robots.txt, sitemap.xml и коды HTTP на реальном домене; отправить sitemap в панели поисковиков.

Индексируемые страницы: `/` и `/product`. Корзина, формы, подтверждения, каталог просмотра и заготовки информационных страниц имеют noindex. После получения документов решение об индексации этих страниц можно изменить в pageMetadata. Query-параметры вида/цвета не создают отдельный canonical.

OG-картинка содержит цену 2 990 ₽. При изменении цены обновить изображение вместе с каталогом.

## Статический хостинг

Каждому известному маршруту соответствует свой `dist/<path>.html`; для главной — `dist/index.html`. Хостинг должен обслуживать эти файлы на чистых URL. Не переписывать все запросы на главную: иначе потеряются исходные метаданные и корректный статус 404.

Пример для [Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files) в существующем HTTPS server-блоке (на целевом сервере не запускался):

```nginx
root /path/to/website/dist;
index index.html;

location / {
    try_files $uri $uri.html $uri/index.html =404;
}
error_page 404 /404.html;
location = /404.html { internal; }

location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Путь root необходимо заменить на каталог развёртывания. Настройка HTTPS, www-редиректов, сжатия и защитных заголовков относится к хостингу. Для HTML использовать revalidation; файлы с нехешированными именами `/images` и `/fonts` не следует бессрочно кешировать как immutable. Несуществующие пути должны возвращать 404, а не 200 со страницей ошибки. Для другого хостинга настроить аналогичное сопоставление URL с пререндеренными файлами.

Это базовая техническая подготовка SEO. Индексация на реальном домене и результаты поиска не проверялись: домена и публикации пока нет.

## Основания

- [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) — рендеринг, исходный HTML и индексирование.
- [Google: canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) — выбор канонических адресов.
- [Open Graph protocol](https://ogp.me/) — свойства соцпревью.
