# Website imagery — one photographed product

Updated 2026-09-10 after the photo-first review. The current implementation is governed by [unified-product-direction.md](unified-product-direction.md). Client photography defines the shape, three panels, fine pebbled leather, stitches and upright navy lettering. The old landing reference governs the atmosphere and blue insert; its italic product lettering does not override the actual client product.

## Current sources and composition

| Delivery asset under website/public/images/editorial/ | Source | Use |
| --- | --- | --- |
| product-original-1254.webp | references/product-photos/client-white-front.png | Every cardholder placement; one image, not separate generations |
| product-silhouette.svg | Hand-authored display mask in the original photograph's coordinate space | Removes surrounding white canvas in the interface without repainting the photo |
| key-still-{480,960,1448}.webp | previews/photo-mobile/key.png | Generated static key; bounded size with soft edge blending |
| {hoodie,cap,tshirt,thermos}-{480,720}.webp | previews/website-archive/images/studio/*.png | Earlier generated collection concepts, unavailable to order |

`website/src/product-photo.ts` renders the same source photograph in the hero, introduction, gallery, collection, cart, checkout and confirmation preview. A simple blue CSS insert covers part of the upper rear panel where the card belongs, behind the photographed middle pocket lip. The insert is a graphic compositing layer, not evidence of a real photoshoot with a card. Cart/collection and the initial gallery view show the actual empty product.

Transforms only move, rotate in the screen plane or crop this same photographed face. There are no claimed side/rear photographs, no invented product texture and no simulated new camera viewpoints. Shadows and the common pearl background are authored in CSS, not reconstructed physical lighting. The product introduction overlaps the previous section's boundary while keeping content readable.

The key is still a generated image; its animation is deferred. Its soft CSS edge mask is for blending, not a claim of extracted transparency. Collection concepts remain generated. The black client photo remains a reference, not an offered variant.

## Reproduction and archive

Run `node scripts/prepare-images.mjs` from `website/`, with FFmpeg in PATH. It exports 12 WebP files using Lanczos resizing, lossy quality 92 (96 for the original product photograph). The source PNGs remain intact. The product mask and CSS are versioned native interface assets.

Independent generated hero/about frames and their previous WebP derivatives are no longer loaded. Original PNGs are preserved in `previews/photo-mobile/` and `previews/website-archive/images/client/`; old delivery variants are in `previews/website-archive/images/editorial-v1/`. Historical HTML mockups refer to the former layout and are not the current visual specification.

A built-in imagegen extraction attempt produced RGB pixels with a drawn checkerboard and changed leather detail. It was rejected and never shipped. The prompt and rejection reason are recorded in the current direction document.

## Verification and physical limits

The shared product source, gallery controls, cart/checkout and responsive geometry were checked in Chromium. Widths include 320, 390, 430, 768, 1024, 1440, 1920, 2560 and 3840 px. Current browser results are recorded in [unified-product-direction.md](unified-product-direction.md); earlier pass results remain in [verification-mobile-photo.md](verification-mobile-photo.md).

This is a 2D photo composition. It cannot reveal product depth or unphotographed surfaces. The original visible product is about 940 pixels wide; image display is bounded rather than substituting generated high-frequency details. Real Safari/Android/iPhone hardware and field performance were not measured. Checkout still has no payment/order backend and must not show a false submitted order.

## Preserved Blender work

`revisions/photorealism/native-lookdev.blend` and native reviews in `previews/client-relit/` / `previews/key-relit/` are unchanged by this website pass. See [client-relight-pass.md](client-relight-pass.md) for their earlier status.

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
