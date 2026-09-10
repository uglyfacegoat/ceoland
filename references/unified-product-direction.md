# Единое изделие и широкие экраны

## Причина дефектов

Проверка 3840 × 2160: hero 3840 × 1100 и about 3840 × 1000 используют cover для кадра 1672 × 941. Изображение увеличивается и обрезается по вертикали. Ключ растянул секцию до 2253 px, галерея — до 2594 px. Между секциями стыкуются разные запечённые фоны, а независимые генерации меняют фактуру и пропорции товара.

## Новый способ сборки

- Единственный источник кожи, швов, формы и печати — оригинальная фотография заказчика. Повторная генерация отдельного изделия для каждой секции исключается.
- Контур фотографии ограничивается в интерфейсе одной SVG-маской. Сама фотография не перерисовывается. Синяя карточка — отдельный простой графический слой внутри верхнего кармана; это композиция на основе фото, а не новая фотография или 3D-ракурс.
- Один и тот же компонент используется на главном экране, в описании, галерее, коллекции и корзине. Допустимы только перенос, поворот в плоскости и приближение к деталям. Не имитируем невидимую оборотную сторону.
- Один жемчужный фон, ограниченная ширина контента, мягкое локальное освещение. Секции отделяются пространством, тонкой линией и композицией, а не прямоугольными фотографическими подложками разных цветов.
- Картхолдер в блоке о продукте пересекает верхнюю границу секции. На телефоне величина выхода меньше; текст и кнопки остаются свободными.
- Ширина основной композиции ограничена 1680 px. Изображения не увеличиваются бесконтрольно с шириной 4K-экрана. Проверяются 3840/2560/1920/1440/1024 и телефоны 320/390/430 px.
- Ключ остаётся статичным. Его прежний кадр ограничен по размеру и вписан в общий фон; анимация по-прежнему отложена.

## Отклонённая генерация

Проба built-in imagegen `exec-575ee554-190d-4dbe-9ed1-273eecd75fc8.png` получила нарисованный клетчатый фон вместо alpha (`rgb24`) и изменила фактуру. Она не используется на сайте. Исходная фотография и маска в интерфейсе сохраняют настоящее изделие.

## Промпт отклонённой пробы

> Use case: background-extraction and precise-object-edit.
> Asset type: ONE master transparent cutout for a premium product website, reused everywhere. Edit target: supplied actual customer photograph of the WHITE cardholder. This is an extraction edit, not a new product design.
> Remove only the white photographic backdrop and its cast shadow. Output a REAL TRANSPARENT alpha background (not checkerboard pixels, not white or gray). Keep the photographed object, its precise silhouette, proportions, THREE panels, existing fine pebbled leather, straight upright navy print and thin stitches unchanged. Tight landscape framing with about 5% transparent margin around the entire object; no cut-off corners. Front-on camera, no perspective, no rotation, no relighting. Product actual width/height about 1.46. Near-square upper corners and rounder lower corners, very thin flat panels.
> Only addition: a very narrow deep cobalt blue card strip inside the highest pocket, covering about the lower 55% of the visible rear leather band; retain a visible white top strip and seam above it, card edges inset from the left/right stitches. The blue card sits BEHIND the lip of the middle leather panel. Do not increase the object's height or move the pocket lips.
> Text already in the image must stay EXACTLY its existing upright dark navy typography, size and location: “I’m CEO,” first line, “Bitch” second line. Never italicize, retype, emboss or redesign. Maintain the tiny leather grain through the print. Preserve actual photographed exposure with visible texture, no whitening, no extra gloss.
> No floor, no scene, no rectangle, no shadow outside the product, no props, no extra marks. TRANSPARENT alpha background. Highest fidelity and clean antialiased extraction edges.

## Проверка результата

Chromium через agent-browser, Vite на `127.0.0.1:5174`, 10 сентября 2026. Горизонтального переполнения нет на 320/390/430/768/1024/1440/1920/2560/3840 px. На 3840 × 2160 hero занимает 1015 px по высоте, ключ — 804 px, галерея — 1222 px вместо прежних 1100/2253/2594 px. Все секции используют ограниченную сетку, а не полноширинный cover.

Выход фотографии над границей about: 49 px на 320, 54 px на 390, 88 px на 1440 и 139 px на 3840. Полный лендинг просмотрен на 390 и 3840 px; отдельно просмотрены переход, главный экран на 1024/1440, корзина и оформление на телефоне.

Все 12 изображений декодируются; все вхождения картхолдера загружают один `product-original-1254.webp`. Проверены переключение галереи кнопками, стрелкой клавиатуры и имитацией touch-свайпа, открытие/закрытие меню, добавление товара, корзина и переход к оформлению. На 4K оформление остаётся шириной 960 px. Ошибок JavaScript нет. `npm run build` (TypeScript + Vite), `node --check scripts/prepare-images.mjs` и `git diff --check` прошли.

Публичные файлы занимают 496 424 байта. Старые 12 WebP перенесены в `previews/website-archive/images/editorial-v1/`; исходники сохранены. Это размеры файлов, не измерение сети или Core Web Vitals. Проверки физического телефона и Safari не проводились. Ключ остаётся статичным; обработка фона ключа — мягкая CSS-маска и смешивание, не прозрачный PNG. Совпадение постановки с референсом 1:1 не заявляется.
