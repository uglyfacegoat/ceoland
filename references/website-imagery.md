# Website imagery — photo-first mobile pass

Updated 2026-09-10. Client photographs govern the actual product: three thin leather panels, fine pebbled grain and upright navy artwork. The user retained the blue card in staged images and deferred key animation. Landing references govern the cool pearl-white/navy atmosphere and composition.

## Current delivery

All paths in the first column are under `website/public/images/editorial/`. Width suffixes are pixels; responsive sources select an appropriate delivery size.

| Delivery family | Master | Origin and use |
| --- | --- | --- |
| hero-mobile-{480,960,1254}.webp | previews/photo-mobile/hero.png | Newly generated staging from the client photo; mobile/tablet hero and gallery scene |
| about-mobile-{480,960,1254}.webp | previews/photo-mobile/about.png | Newly generated close-up; mobile/tablet product introduction |
| key-still-{480,960,1448}.webp | previews/photo-mobile/key.png | Newly generated brushed-metal key from supplied reference; one static instruction image |
| hero-desktop-{1280,1672}.webp | previews/website-archive/images/client/hero-photo.png | Previously generated wide hero |
| about-desktop-{1280,1672}.webp | previews/website-archive/images/client/about-photo.png | Previously generated wide product introduction |
| product-original-{240,640,1254}.webp | references/product-photos/client-white-front.png | Original client photography; gallery, detail crop, collection, cart and checkout |
| {hoodie,cap,tshirt,thermos}-{480,720}.webp | previews/website-archive/images/studio/*.png | Previously generated collection concepts; coming soon, unavailable to order |

The campaign scenes are generated visualizations, not documentary photographs or current Blender renders. Product identity was compared visually, but exact shape, texture and letter preservation are not guaranteed. The original gallery frame is resized/encoded from the actual client photograph, with no generated detail; its close-up uses CSS cropping. The black client photo remains a reference, not an offered colour variant.

Separate mobile compositions avoid cropping the product out of a wide desktop image. Background shading and shadows are inside the images; the mobile hero uses an edge mask to blend its backdrop into the page. The key section now displays four readable steps in normal page flow; there is no pinned animation or simulated 3D rotation.

## Reproducible exports

Run `node scripts/prepare-images.mjs` from `website/`, with FFmpeg in PATH. The script produces 24 WebP files using Lanczos resizing and lossy WebP quality 92 (96 for the original product photograph). Full PNG masters remain preserved. No image generation or retouching occurs during export.

Public files occupy 1,507,483 bytes after archiving unused originals and models; the production build is about 1.55 MB. This is total disk size, not a measured first-load transfer or Core Web Vitals score. Responsive sources and lazy loading reduce the assets needed for a particular viewport.

Old public images and GLBs are preserved in `previews/website-archive/`, outside Vite's copied public directory. Historical export scripts may still target their former public locations and should not be run as the current delivery pipeline.

## Planning and verification

- [Mobile direction](mobile-photo-direction.md): decisions recorded before implementation.
- [Five-screen HTML mockup](mobile-photo-layout.html): reviewed before editing the main interface.
- [New image prompts](mobile-photo-prompts.md): exact prompts, built-in imagegen source outputs and accepted masters.
- [Browser verification](verification-mobile-photo.md): actual checks and remaining limits.

## Preserved Blender work

`revisions/photorealism/native-lookdev.blend` retains the relightable leather study and independent key scene. Native review masters are in `previews/client-relit/` and `previews/key-relit/`; neither native hero nor native key frames are currently used by the website. The previous four native key delivery WebPs are in the archive. [client-relight-pass.md](client-relight-pass.md) records that earlier stage, including its material and lighting limits.

## Historical desktop generation prompts

Only the real white product photograph was supplied as the reference in the accepted staging calls. Earlier generations based on the old landing artwork were rejected for product identity.

### Hero

Generated source: exec-f33ee31c-80c6-491b-baf2-7d64e2ec26c9.png.

Use case: compositing. The attached photo is the actual physical product. Make a studio campaign image by repositioning THIS EXACT photographed cardholder. Treat the product as a locked photographic cutout: preserve its silhouette, three leather panels, pocket heights, seams, all small pebbled grain, and the EXACT already printed artwork. Do not redraw, redesign, retype, italicize or invent the product. Preserve the existing letters as photographed pixels. They read "I’m CEO," on the first line, "Bitch" on the second; they must remain the same upright bold letters of this photo, with the same relative size and position.
Only requested product addition: place one deep cobalt blue card into the upper pocket, a strip occupying about 7% of total product height. Keep the product outline otherwise unchanged. The actual product is a fairly wide rectangle, width / height about 1.46, lower two corners mildly rounded, upper two corners almost square with a tiny soft radius. Thin leather layers, almost flat, not puffy. Do not round the whole perimeter into a padded tablet.
Build a landscape 16:9 studio photograph around this exact object: move it into the right side at center x=70%, y=52%, rotate it clockwise 14 degrees in the image plane, no strong perspective foreshortening. Entire product bounding width around 36% of full canvas. Product floats above the floor; one wide diffuse shadow below it centered around x=65%, y=85%. Background is very pale pearl white and cool blue-gray, broad soft diagonal daylight bands coming down from upper right, a slight darker gray-blue right side. Left 48% is empty bright low-contrast negative space for website text to be added in HTML. Keep product exposure like the real photo, with the detailed surface and dark navy ink readable. Integrate light naturally without bright glare or gloss.
NO website UI, no added text, no icons or logos beyond original real slogan, no podium, no props, no extra products. Product identity fidelity is more important than stylization or cinematic effects.

### Introduction

Generated source: exec-5d2a043e-ff55-4ddb-a082-42ac3712eb08.png.

Use case: compositing. Create a landscape 16:9 luxury product photograph for a website product-introduction section. The sole attached image is the exact REAL cardholder; preserve its identity as a photographic object: the same width-to-height ratio 1.46, three thin nearly flat white leather panels with rounded pebbled grain, near-square softly finished top corners, more rounded bottom corners, white perimeter stitching, and EXACT existing upright dark navy printed artwork ("I’m CEO," / "Bitch") at the same size and position. Do not retype, italicize or redesign this artwork. No padded tablet border, no exaggerated leather folds, no extra seams. Keep surface grain from the real photo. Add a narrow deep-blue card insert in the upper pocket.
Composition: product lies almost flat on a seamless pale cool-gray studio floor in LEFT half, rotated counterclockwise about 20 degrees, front visible. Large tactile close-up, occupying x=-7% to 54% and y=13% to 89%; a little of its left edge may leave the frame, but entire slogan is readable. This is a different view from the floating hero, resting on floor with a believable soft cast shadow stretching to lower-right. Right 42% of canvas is clear pearl-white negative space for later HTML typography. Cool-white photographic daylight from upper left, midtone gray-blue shadow, natural soft reflected fill so dark printing stays dark and fine leather relief visible. No glare, no plastic, no blown highlights. Strong product detail and gentle contrast; premium editorial camera photograph.
Only the actual slogan on product. NO website UI, no heading or labels, no navbar, no watermark, no props, no podium.

## Remaining fidelity and product limits

- Generated staging approximates the client product; it is not evidence of a pixel-exact recreation or a physical photoshoot.
- No client side/back photographs were supplied. The gallery intentionally contains the original front, staged scene and front-detail crop.
- The static key is a generated concept. Continuous movement and reverse-code choreography are deferred.
- Checkout has no order backend or payment integration; it never pretends an order was accepted or clears the basket on submission. Policy/legal pages still require the merchant's real documents before launch.