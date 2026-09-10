# Native material and lighting pass — 10 September 2026

Historical native pass. The subsequent website implementation uses generated photographic staging and a static key image; see [mobile-photo-direction.md](mobile-photo-direction.md) and [website-imagery.md](website-imagery.md). References below to key delivery describe this earlier pass. Native scenes and review masters remain preserved.

Current editable file: `revisions/photorealism/native-lookdev.blend`.
Recovery checkpoint: `revisions/photorealism/before-fidelity-20260910-111353.blend`.
The file was updated in the connected Blender. Background rendering does not save over the live scene.

## Scope and authoritative references

SCENE: Cycles, metres, Z-up, frame 1. The current composition floats above a seamless floor without a podium. The client photographs in `references/product-photos/` govern product proportions, leather and upright artwork; the landing reference governs composition. Keep the blue insert in the hero.

HIERARCHY: preserve the three separate panels under `WEB_HERO_cardholder`, their thin profiles, native seams and hidden lettering sources. The independent `CEOMENTALITY | Key lookdev` scene retains the original key's topology and engraved faces. Current card scene: `CEOMENTALITY | Web studio`.

ASSETS: existing cardholder, blue card, key and cyclorama. No image generation in this pass. Approximate product widths are 105 mm for the cardholder and 29 mm for the key head; these remain authored dimensions, not measurements supplied by the client.

SHOT: hero camera `WEB_CAM_product`, 2560 × 1440, 256 samples. Product bounding-box centre is approximately 69.5% across and 53% down, with a 325 mm orthographic camera width. The top leans backward. Neutral front and macro cameras isolate material behaviour. Key stills are 1672 × 941, 192 samples.

MOTION: four discrete key poses with the existing browser crossfade. Continuous 3D rotation remains deferred as requested.

## Leather, print and seams

The previous Leather037 surface produced narrow angular valleys. Current height and roughness use [ambientCG Leather030](https://ambientcg.com/view?id=Leather030), a **procedural** pebbled material under [CC0](https://docs.ambientcg.com/license/). It is not a scan of the actual product. Neither source colour nor a separate normal map is used.

- UV repeat: 110 mm with a different offset on each panel.
- Displacement Scale: 90 µm, Midlevel 0.5, Cycles `BOTH` (displacement and bump). Cubic interpolation; height and roughness are Non-Color data. There is one relief path, without stacked normal/bump treatments.
- Leather: base colour `(0.68, 0.665, 0.64)`, IOR 1.46, Specular IOR Level 0.5, roughness mapped to 0.46–0.65, diffuse roughness 0.15, sheen weight 0.025.
- Ink: independently authored navy `(0.0009, 0.0016, 0.018)`, roughness 0.50. Only bounded artwork coverage comes from the client photograph; photographed illumination is not used as surface colour. The print shares the leather relief and is assigned only to the pocket exterior.
- Threads retain the previous surface fit. New needle impressions depress the dense exterior mesh by at most 45 µm around stitch endpoints, with matching endpoint seating. The panels carry an explicit `needle_impressions` marker so repeated application does not deepen them.

All material scales are artistic estimates. The client photo still has a different fine grain and more varied seam compression; a stronger displacement value alone will not reproduce it.

## Cardholder lighting

AgX / Medium High Contrast / exposure 0, with a weak cool world at strength 0.035.

| Source | Current setting | Purpose |
| --- | --- | --- |
| Hero key | `(0.28, -0.05, 0.27)` m, 2.1 W, rectangle 0.09 × 0.18 m | Grazing relief and pocket lips |
| Fill | `(-0.20, -0.23, 0.12)` m, 0.1 W, rectangle 0.30 × 0.35 m | Weak cool product fill |
| Background | `(0.45, -0.30, 0.70)` m, 155 W, point radius 0.10 m | Broad background transition and floor shadow |
| Diagnostic key | `(0.16, -0.20, 0.28)` m, 5.5 W | Front/macro relief review; separate from hero exposure |

Key and fill are linked to product receivers; the background source is linked to the cyclorama. Its shadow blockers include the physical flag and product meshes. This avoids additional direct floor illumination from product lights, while the environment still contributes indirect light.

`RELIT_ENV_window_mullion` contains two tessellated strips. Camera rays locate their intended shadows on the curved cyclorama; each blocker vertex is placed a quarter of the way from receiver to lamp. The previous fixed-height construction could put part of a flag outside that light path. The flag is camera-invisible. This setup uses deliberate light linking and visibility controls; it is not a recovered physical shooting rig.

## Key material and reflections

The head and blade have separate machining directions. Head brushing runs across the face; blade brushing follows its length. Object-space tangent directions rotate with each mesh. Relief is micrometre-scale, with roughness variation and the original recessed engraving material assignments preserved.

A 0.09 × 0.10 m reflection softbox sits along the calculated reflection direction of the head: 0.20 W standing, 0.10 W close-up. The narrow edge strip shapes machined edges. Both are linked to the product; a separate 7.5 W floor light creates the support shadow.

Dark reflection cards establish the head edge and hole depth. The new lower card blocks the white floor reflection in the blade flutes; it is visible to glossy rays, hidden from camera, diffuse and shadow rays. The blade now has long dark channels rather than a uniform pale fill. The standing yaw is 30 degrees. The fourth frame uses the retained blue engraving emission.

This is a native Blender render with real engraving, not generated imagery. Its finish is still cleaner and more uniform than the photographed key reference.

## Saved outputs and verification

| Output | Review purpose |
| --- | --- |
| `previews/client-relit/hero.png` | Complete 2560 × 1440 floating composition |
| `previews/client-relit/front-beauty.png` | 1200 square; three layers and upright print; blue card hidden for photo comparison |
| `previews/client-relit/macro-beauty.png`, `macro-reverse.png` | 1400 square; actual relief response under reversed key light |
| `previews/client-relit/hero-world.png`, `hero-key.png`, `hero-fill.png`, `hero-background.png` | Isolated light contributions |
| `previews/key-relit/standing.png`, `access.png`, `code.png`, `active.png` | Four current native key stills |
| `previews/key-relit/standing-key-only.png`, `standing-world-only.png` | Reflected source versus environment contribution |
| `previews/client-relit/reopen-check.json` | Separate-process checks of the saved scene, materials and image sources |

The complete cardholder views, macro reversal and four key views were visually inspected. Isolated contributions were regenerated. A dedicated raw-versus-denoised comparison was not repeated. Structural checks do not establish photorealism or pixel identity.

The live scene packs the three used image sources: Leather030 height, Leather030 roughness and client artwork coverage source. Separate-process reopening passes. Reapplying the complete card material/seam pass twice produced identical coordinates for all three panels and four seam meshes; it does not compound the impressions.

The four new key renders are on the website as losslessly encoded 8-bit WebP files (808,888 bytes combined), with the native 16-bit PNG masters retained. Browser checks covered all four steps on desktop and mobile: correct frame and counter, pinned viewport, decoded images, no horizontal overflow or browser errors. `npm run build` passed TypeScript checking and Vite build. There is no configured lint or automated test script; neither is claimed.

## Remaining differences

1. The native cardholder hero is too pale and its background transitions/shadow are weaker than the no-podium reference. Preserve the current product proportions and separate exposure from backdrop contrast in the next lighting pass.
2. The new rounded relief is closer in character, but the fine grain and irregular stitch entry/compression still differ from the client photograph. Evaluate at both macro and intended website resolution.
3. The key now reads as metal, but its machining is too uniform and the surrounding light remains simpler than the reference.
4. Website cardholder hero/about still use the previously documented generated plates. **Only the key imagery was replaced in this pass.** Do not present the current website cardholder as an export of the native Blender study.

Reference parity has not been achieved. The current files are reproducible progress with these explicit limits.

## Reproduction

From the repository root in PowerShell:

```powershell
$blenderExe = 'C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe'
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/client_relit.py -- --view hero --name hero --width 2560 --samples 256
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/key_relit.py -- --shot standing
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/review_native.py -- --suite
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/review_native.py
```

Use `--shot access`, `code` or `active` for the other key frames. Rendering commands operate on a background copy and do not save the live Blender file. Preserve a checkpoint before future connected edits. Website encoding is documented in `website-imagery.md`.
