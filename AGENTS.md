# CEOMENTALITY: working context

Before changing product geometry, materials, lighting, or website imagery, read
`references/photorealism-playbook.md`. It records the user's current direction,
primary research sources, confirmed defects, tested changes, and remaining work.

- Latest saved client-photo fit: `revisions/photorealism/client-photo-fit.blend`.
- Previous material study: `revisions/photorealism/foundation-study.blend`.
- Client photos in `references/product-photos/` are authoritative for the product
  shape and upright printed artwork. Keep the blue card insert in the hero.
- The latest model uses front-photo projection for front-facing stills. It is
  not a relightable PBR scan. Website imagery and its limitations are documented
  in `references/website-imagery.md`; accepted generated hero/about plates are wired.
- Do not hide panels by searching for the substring "stitch": the middle panel
  is named "unstitched upper edge". Use explicit panel names and seam selection.
- Active working scene: `CEOMENTALITY | Web studio`.
- The latest hero reference floats above the floor without a podium.
- Inspect the connected Blender state before writing. Preserve the user's current
  changes in a separate checkpoint and verify the saved result can reopen.
- Preserve the three leather layers and native lettering source. The visible
  front print now belongs to the leather material; hidden flat letters must not
  reappear over it when changing poses.
- The material study is not a finished website render. Finish the recorded
  visual checks before replacing website imagery. Do not report reference parity
  while visible differences remain.
