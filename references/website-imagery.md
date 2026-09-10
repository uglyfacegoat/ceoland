# Website imagery — client product pass

Updated 2026-09-09. Client photographs take priority over the older stylized landing reference for product shape, leather and artwork. The user explicitly retained the blue card insert.

## Sources used on the website

| File under website/public/images/ | Origin | Use |
| --- | --- | --- |
| client/white-front.png | Original client photograph, copied without editing | Product gallery, details via CSS crop, cart, collection |
| client/black-front.png | Original client photograph, copied without editing | Reference, not an offered colour variant |
| client/hero-photo.png | Imagegen staging based on the white client photograph | Hero and gallery composition |
| client/about-photo.png | Imagegen staging based on the white client photograph | Product introduction |
| studio/key-standing.png, key-access.png, key-code.png, key-active.png | Native Blender/Cycles renders via scripts/key_studio.py | Four sticky story frames |
| studio/hoodie.png, cap.png, tshirt.png, thermos.png | Previously generated collection concepts | Coming-soon cards; cannot be added to cart |

The two staged product pictures are generated visualizations, not photographs of a physical shoot or exports of the current Blender scene. Their identity was compared visually with the client photo; exact pixel preservation is not guaranteed. Gallery details use the original photo, without invented texture. No CSS product shadows, painted lighting bands or fake key geometry remain. Mobile-only edge masking blends the bottom of the wide hero crop into the page background.

## Blender state

Native continuation, 2026-09-10: `revisions/photorealism/native-lookdev.blend` now contains a relightable leather study and an independent key scene. Review outputs are in `previews/client-relit/` and `previews/key-relit/`. They have **not** replaced website imagery: full-shot texture, background contrast and key machining still need refinement. The projection workflow described below is the retained previous revision; current details are in [client-relight-pass.md](client-relight-pass.md).

scripts/client_cardholder.py calibrates the dimensions of the existing three panels and projects the client photograph onto their front-facing surfaces. The photograph retains captured lighting and is **not a relightable PBR albedo/normal scan**. Front-render.png and detail-render.png remain review exports, not website gallery inputs: the skin and ink still look too flat/pale under the new scene light.

A visibility bug matched the substring "stitch" in the middle panel's name ("unstitched upper edge"). It incorrectly marked that panel CLIENT_photo_seam and hid it. The fix explicitly restores the three named leather panels and only hides objects named as stitching. Verified in the live Blender scene, saved file and rerendered control images. Checkpoint: revisions/photorealism/before-panel-visibility.blend. Current cardholder: revisions/photorealism/client-photo-fit.blend.

The key material has procedural brushing, metallic reflection, polished edge material and a real black reflection card. The four poses are discrete renders with a browser crossfade. Continuous 3D rotation remains deferred as the user allowed. The random engraved code is demonstrative and is not a working access credential.

## Generation prompts

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

## Remaining fidelity limits

- The staged hero's cardholder is somewhat larger and more upright than the old landing composition. Client product identity is the stronger constraint.
- Native cardholder lighting/materials are still a study; a photo projection cannot be used as evidence of a physically measured leather shader.
- Key machining and reflections still differ from the photographic key reference.
- Back and side product photographs have not been provided, so the gallery does not label an invented view as a real product photograph.
- Checkout remains a visual preview: no payment provider or order backend is connected. It must never clear the basket and display a false accepted order.
