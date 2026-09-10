# CEOMENTALITY: working context

Before changing product geometry, materials, lighting, or website imagery, read
`references/photorealism-playbook.md`. It records the user's current direction,
primary research sources, confirmed defects, tested changes, and remaining work.

Current website direction: photo-first and mobile-first. Read
`references/mobile-photo-direction.md` and `references/website-imagery.md`.
New mobile hero/about and static key images are generated from the supplied
references. Original client photography remains in the gallery and cart.
Key animation is deferred; four instruction steps use normal scrolling.
Delivery images live in `website/public/images/editorial/`; previous public
models/images are preserved in `previews/website-archive/`, outside the build.

- Latest native material pass: `revisions/photorealism/native-lookdev.blend`.
- Read `references/client-relight-pass.md` for the current state and review limits.
- Previous client-photo fit: `revisions/photorealism/client-photo-fit.blend`.
- Previous material study: `revisions/photorealism/foundation-study.blend`.
- Client photos in `references/product-photos/` are authoritative for the product
  shape and upright printed artwork. Keep the blue card insert in the hero.
- The native pass uses independent leather colour, height/roughness maps and
  only an isolated print coverage mask from the client photograph. It is an
  authored PBR material, not a scan of the actual product. Website hero/about
  plates remain generated; see `references/website-imagery.md` for provenance.
- The previous four native key frames remain review assets from
  `scripts/key_relit.py`. The current website uses a generated static key photo.
- Do not hide panels by searching for the substring "stitch": the middle panel
  is named "unstitched upper edge". Use explicit panel names and seam selection.
- Active working scene: `CEOMENTALITY | Web studio`.
- Independent key material scene: `CEOMENTALITY | Key lookdev`.
- Set the active scene before updating a camera/pose; a different scene's view
  layer will not evaluate its object matrices. Preserve key material indices
  when replacing slots, or the real engraving loses its material assignment.
- The latest hero reference floats above the floor without a podium.
- Inspect the connected Blender state before writing. Preserve the user's current
  changes in a separate checkpoint and verify the saved result can reopen.
- Preserve the three leather layers and native lettering source. The visible
  front print now belongs to the leather material; hidden flat letters must not
  reappear over it when changing poses.
- The material study is not a finished website render. Finish the recorded
  visual checks before replacing website imagery. Do not report reference parity
  while visible differences remain.
