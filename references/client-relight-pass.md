# Native cardholder material pass — 10 September 2026

SCENE
- intent: replace the fixed front photograph shader with a relightable product material.
- deliverable: native Cycles close-up, front comparison and floating hero; editable live Blender state.
- units: metres; axes: right-handed Z-up.
- render: Cycles / 1400 square diagnostic, 1920 × 1080 hero, existing frame 1.
- dynamic: no; current task is the previously requested product stills. Key animation remains deferred.

HIERARCHY
- preserve WEB_HERO_cardholder and its separate three leather panels, card and lettering sources.
- protected: other scenes, key meshes, previous material datablocks and website plates.
- modify: panel material assignments/UVs, seam surface fit, WEB_CAM_product and key/fill lighting.
- checkpoint: before-relight-20260910-082950.blend; active file initially client-photo-fit.blend.

ASSETS
- A01 cardholder | [EXISTING] | detailed hero | [0.105, approximately 0.0035, 0.07214] m | diagnostic centre [0,0,0.075] | no diagnostic rotation | central root, separate panels.
- A02 inserted blue card | [EXISTING] | detailed | retained shape and position relative to root; omitted only for photograph comparison.
- A03 seamless studio | [EXISTING] | detailed supporting surface | retained floor/cyclorama; no podium.
- no generation and no credits.

SHOT
- active camera: WEB_CAM_product.
- diagnostic: orthographic front and mild three-quarter, width 0.13–0.14 m; entire product and shadow visible.
- hero: floating object on right; clear left half for website copy; prior no-podium reference.

LOOK
- material route [EXISTING]: ambientCG Leather037 normal/roughness with explicit physical UV scale, separately authored pigment.
- photo only supplies the dark artwork mask within its measured printed bounds, never full surface colour or inferred height.
- white dielectric leather, navy pigment on same normal field, linen seam, blue insert.
- tile size initially 0.08 m, normal strength tested against close-up; no photographed illumination in base colour.
- positive rounded pebbles and fine grooves; avoid exaggerated displacement and bulky corners.

LIGHTING
- focal subject: product texture and exact upright artwork; darkest region: ink and small contact creases.
- broad daylight from upper right, weak cool fill; existing studio, no HDRI required.
- broad highlight should reveal lips and grain without washing out white leather.
- AgX / Medium High Contrast / exposure 0 fixed for comparisons.
- diagnostic isolated world/key/fill, reversed-key relief comparison and grayscale inspection before final.

MOTION
- static control views; no continuous key motion claimed.

ACCEPTANCE
- three visible panels, tiny upper corner radii, stronger lower radii; thin profile.
- print agrees with client photo and shares surface relief.
- grain and thread have actual light response; no double photo/geometry seams.
- close-up and intended hero resolution visually reviewed, no black intersection artifacts.
- live state contains the actual changes; recovery copy reopens successfully.

refs_read: blender-scene, blender-scene-spec, blender-modeling, blender-lookdev, blender-lighting-camera, blender-audit-finalize.

CHECKLIST
- [x] A: inspect live Blender, source and modules.
- [x] B: preserve previous saved state.
- [x] C: clay/camera/proportions reviewed.
- [x] D: native material, seams and lighting pass applied; artistic acceptance remains open.
- [x] E: renders reviewed and saved file reopened successfully; live scene uses the new version.

Sources: [Leather037](https://ambientcg.com/view?id=Leather037), [Leather038](https://ambientcg.com/view?id=Leather038), photometric stereo scans under CC0. These are comparable material samples, not scans of the client's product. Dimensions and material parameters remain artistic estimates.

## Key stage — separate editable scene

SCENE
- intent: correct the uniform grey metal and coarse brushing in the previous four key renders.
- deliverable: native standing and close Access/code control stills; no generated plates.
- units: metres; right-handed Z-up; Cycles, 1672 × 941, frame 1, static per existing four-frame brief.

HIERARCHY / ASSETS
- [EXISTING] copy WEB_HERO_key head and blade into CEOMENTALITY | Key lookdev with independent meshes/materials.
- original key, cardholder and website images protected.
- KEYRELIT key root, head and blade; approximate dimensions [0.029,0.0035,0.063] m.
- [EXISTING] copied cyclorama; [BLOCK] named softbox, strip, floor light and off-camera black reflection card.
- preserve real engraving geometry; no flat text plane substitution.

SHOT / LOOK
- standing first, slight three-quarter angle, full blade and hole visible; close Access/code thereafter.
- independent KEYRELIT camera; orthographic 0.155 m wide standing / 0.125 m close.
- brushed nickel with micrometre-scale relief, polished machined edges, darker recessed engraving.
- brushing measured in object metres, primarily horizontal on head.

LIGHTING / MOTION
- reflection softbox aimed through the mirror reflection direction of the head; dark card shapes the opposite edge.
- edge strip for machined silhouette; floor daylight for support shadow.
- world-only/key-only/grayscale checks; AgX Medium High Contrast/exposure 0 fixed.
- static four poses, no motion audit claim.

ACCEPTANCE
- camera-read gate uses retained reference-matched silhouette; no geometry redesign in this pass.
- clear silver/dark reflection contrast, softbox must not flatten head to white or grey.
- engraving, flutes, hole thickness and bevels readable in viewed renders.
- source scene preserved; saved copy reopens and live Blender exposes both work scenes.

## Saved result and checks

Current file: `revisions/photorealism/native-lookdev.blend`, saved from the connected Blender with the cardholder scene active. Four used image sources are packed. The independent key scene is in the same file. Previous client-photo projection and the pre-edit checkpoint remain available.

Changes in this pass:
- Leather037 normal, roughness and height use explicit per-panel UV coordinates, an 80 mm repeat and different offsets. Displacement Scale is 55 micrometres, not a measured grain height; normal strength is 0.8.
- The front photograph feeds only bounded ink coverage. White leather and navy pigment have independent colours; photographic shadows no longer supply surface colour. The exact upright letter shapes come from the client image.
- The printed material is assigned only to the exterior face of the front pocket. Its back and thickness use plain leather, preventing the projected artwork from appearing inside the pocket.
- Native threads are visible again. Each ring was fitted by ray cast to its own panel; thread width was reduced, centres lifted and ends seated into the skin. The middle panel remains explicitly visible.
- Main cardholder light is a grazing area source at `[0.28, -0.02, 0.27]` m, 3 W, with a weak 0.1 W fill. A 50 W point source with 12 mm radius lights the background through a physical off-camera flag. Light/shadow linking restricts that background source to the cyclorama and its flag, avoiding a second product shadow. This is artistic lighting control, not a recovered real-world shooting setup.
- The key uses independent meshes, worlds and materials, fine brushing, a satin face, polished edges and dark recessed engraving. Off-camera dark reflectors establish edge and hole thickness. Four stills were rendered; continuous animation is still deferred.
- Fixed two implementation traps: update the correct scene's dependency graph when switching subjects, and restore original polygon material indices after replacing key material slots. Otherwise the geometry can be posed using stale matrices or lose its engraved finish.

Viewed native Cycles outputs:

| Output | What it established |
| --- | --- |
| `previews/client-relit/clay.png` | Three panels, thin profile and client proportions in the initial geometry check |
| `previews/client-relit/hero.png` | 1920 × 1080, 256 samples; floating cardholder, blue insert, current complete lighting |
| `previews/client-relit/front-beauty.png` | 1200 square; exact upright artwork and three layers, no inserted card for the client-photo comparison |
| `previews/client-relit/macro-beauty.png`, `macro-reverse.png` | 1400 square; the light reversal changes the actual grain/ink/thread shading |
| `previews/client-relit/hero-world.png`, `hero-key.png`, `hero-fill.png`, `hero-background.png` | Isolated light contributions: world/fill are weak; the key reveals relief; the background source provides a broad diagonal transition and indirect fill |
| `previews/key-relit/standing.png`, `access.png`, `code.png`, `active.png` | 1672 × 941, 192 samples; four static poses, real engraving and blue code state |
| `previews/key-relit/standing-key-only.png`, `standing-world-only.png` | Metal reads from its reflected sources; the unlit world alone does not describe the form |
| `previews/client-relit/reopen-check.json` | A separate Blender process reopened the saved file and passed the structural/material/image checks |

The renders above were inspected visually. No final pixel-level identity or photorealism claim follows from structural checks. A dedicated raw-versus-denoised comparison was not repeated in this pass.

## Remaining differences and next pass

1. Leather037 has narrower, more angular valleys than the rounded pebbles in the client's black product photograph. Find or author a closer relief before adding stronger displacement; raising normal strength does not fix the wrong grain shape.
2. The native hero still has weaker background contrast and a thinner-looking floor shadow than the landing reference. Preserve the product exposure while refining that ratio.
3. Macro seams are now real geometry, but the stitch entry points and irregular compression do not yet reproduce the photographed seam. Check those against the client photo, not the older inflated reference geometry.
4. The key head has readable metal edges and engraving, but its blade remains too uniformly light. Shape the reflected environment around the flutes; retain the fine brushing instead of returning to coarse procedural scratches.
5. These are review assets. Website hero/about remain generated plates and the sticky story still uses the preceding key renders. Do not describe the website's current cardholder as a Blender render.

Reproduce from the repository root in PowerShell:

```powershell
$blenderExe = 'C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe'
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/client_relit.py -- --view hero --name hero --width 1920 --samples 256
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/key_relit.py -- --shot standing
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/review_native.py -- --suite
& $blenderExe --background revisions/photorealism/native-lookdev.blend --python-exit-code 1 --python scripts/review_native.py
```

Rendering and review commands operate on a background copy; they do not save over the live scene. Apply future accepted changes to the connected Blender and save a named checkpoint explicitly, as in this pass.
