# CEOMENTALITY

## Получение проекта

Крупные файлы моделей, текстур и рендеров хранятся в Git LFS. Перед клонированием установите Git LFS:

```sh
git lfs install
git clone https://github.com/uglyfacegoat/ceoland.git
cd ceoland
git lfs pull
cd website
npm ci
npm run dev
```

Последняя рабочая версия Blender: `revisions/photorealism/native-lookdev.blend`. В ней две отдельные сцены: картхолдер `CEOMENTALITY | Web studio` и ключ `CEOMENTALITY | Key lookdev`. Кожа получила независимый цвет, карты рельефа/шероховатости и маску точной надписи с фото заказчика. Это материал для переосвещения, но не скан реального изделия и не завершённый рекламный кадр. Проверки и ограничения: [client-relight-pass.md](references/client-relight-pass.md).

Предыдущая версия с полной проекцией фотографии сохранена в `revisions/photorealism/client-photo-fit.blend`. Оригиналы фотографий — в `references/product-photos/`, сайт — в `website/`. Главные картинки сайта по-прежнему являются генерациями по фото; новые контрольные рендеры Blender не подменяют их автоматически.

Сайт обновлён по фотографиям заказчика: новые постановочные кадры hero/about, оригинальная фотография и её детали в галерее, четыре рендера металлического ключа в sticky-блоке, изображения будущей коллекции. Источники кадров, промпты и ограничения: [website-imagery.md](references/website-imagery.md). Исследование материалов и света: [photorealism-playbook.md](references/photorealism-playbook.md).

В `client-photo-fit.blend` исправлено случайное скрытие среднего кармана. Отдельная сцена ключа: `revisions/photorealism/key-studio.blend`; воспроизводимые кадры — `scripts/key_studio.py`. Оформление не отправляет заказ и не очищает корзину: оплата не подключена. Макет подтверждения доступен отдельно по `/preview/order-success` и помечен как макет.

Команды и перечень моделей ниже относятся к исторической версии v4; они не заменяют текущую сцену по фото клиента.

Редактируемые модели Blender и первый экран сайта. Картхолдер — v4; ключ сохранён в прежней версии. Blender 5.1.2, Python/bpy, фоновый рендер Cycles/OptiX.

## Файлы

| Назначение | Файл |
| --- | --- |
| Картхолдер, PBR | `blender/cardholder.blend`, `assets/models/cardholder.glb` |
| Ключ с двумя гравировками | `blender/key.blend`, `assets/models/key.glb` |
| Студийная сцена | `blender/hero-scene.blend` |
| Сцена сайта с запечённым светом | `assets/models/hero-scene.glb` |
| Рендер с подиумом | `previews/v4/hero-cardholder-pedestal.png` |
| Рабочая сцена вместе с импортированным референсом | `revisions/v4/cardholder-staged.blend` |

Размеры и число треугольников: `assets/models/manifest.json`. Картхолдер примерно 105.32 × 75.31 × 3.57 мм. Единицы — метры. Отдельные модели имеют центрированный pivot; в glTF лицевая сторона направлена по +Z, верх — +Y.

Картхолдер состоит из задней панели, среднего и переднего карманов. Их края сходятся по бокам и снизу; отдельная боковая вставка удалена. Горизонтальные отверстия карманов открыты. Швы переходят между уровнями; только нижние фронтальные стежки наклонены и перекрываются. Открытых проколов нет. Стяжки, складки и несколько неглубоких линий выполнены геометрией. Верхние углы почти прямые, радиус нижних — 7 мм.

Микрофактура, шероховатость и цвет кожи упакованы в файлы. Solid показывает форму, но не итоговые материалы. Для оценки материалов используйте PNG или Cycles.

## Воспроизведение текущей версии

Из корня проекта в PowerShell:

```powershell
$blenderExe = 'C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe'
& $blenderExe --background revisions/v4/before-joined-layers.blend --python-exit-code 1 --python scripts/join_cardholder_layers.py
& $blenderExe --background revisions/v4/cardholder-refined.blend --python-exit-code 1 --python scripts/review_cardholder.py
& $blenderExe --background revisions/v4/cardholder-refined.blend --python-exit-code 1 --python scripts/export_cardholder_revision.py
& $blenderExe --background revisions/v4/cardholder-staged.blend --python-exit-code 1 --python scripts/bake_hero.py
```

Миграция `join_cardholder_layers.py` использует сохранённый v4 и сохраняет пользовательский референс. Профили поверхностей находятся в `refine_models.py`, сетка кожи и стежки — в `leather_details.py`. `build_models.py` содержит общие операции и исторический генератор первой версии.

Для сайта скопируйте GLB в `website/public/models/`. Освещение `hero-scene.glb` рассчитано на фиксированную композицию. Для другого света или движения относительно подиума используйте отдельный PBR-картхолдер и пересчитайте тени.

## Проверки

```powershell
& $blenderExe --background --factory-startup --python-exit-code 1 --python scripts/verify_models.py
node scripts/validate_gltf.cjs C:/Temp/ceo-asset-validation/node_modules/gltf-validator
python scripts/package_assets.py
```

Отчёты находятся в `assets/models/`. Проверяются повторное открытие исходников, импорт GLB, размеры, pivot, треугольники и упаковка текстур. Художественное совпадение оценивается по рендерам.

Сайт запускается из `website/`: `npm ci`, затем `npm run dev -- --port 5173 --strictPort`. Сборка: `npm run build`. Витрина и локальная корзина работают; оформление пока является демонстрационным интерфейсом без платёжного сервера и не готово к приёму реальных заказов.
