# Website fidelity specification

Reference: the supplied floating hero and eight follow-up screen designs.

Current work follows [the photorealism playbook](photorealism-playbook.md). The material foundation is saved in `revisions/photorealism/foundation-study.blend`; final environment matching remains open. Do not export its diagnostic lighting as the finished website hero.

The existing website mixed uncalibrated transparent renders, CSS shadows and a CSS key. Product scale, font scale, and artificial background bands amplified the mismatch. The corrective route is one photographic treatment rendered from the existing Blender assets, followed by measured HTML typography and layout.

SCENE
- intent: restrained, photographic product studio matching the supplied reference.
- deliverable: editable website studio in the open Blender and optimized still plates for the website.
- units: metres; axes: right-handed Z-up.
- render: Cycles / AgX, 1920 × 1080 hero, 1200 × 1200 catalog; quality review starts at 256 samples and compares raw/denoised output.
- dynamic: static poses now; full key animation explicitly deferred by the user.

HIERARCHY
- dedicated scene: CEOMENTALITY | Web studio.
- subject roots: WEB_HERO_cardholder and WEB_HERO_key; children retain separate geometry.
- protected: all objects and settings in the pre-existing scene.

ASSETS
- A01 existing cardholder, detailed, 0.105 × 0.0035 × 0.075 m; local front -Y; centered parent; preserve the three leather layers and stitching.
- A02 existing nickel key, detailed, approximately 0.031 × 0.003 × 0.066 m; local front -Y; separate parent; real hole, engraved text and milled teeth.
- A03 continuous photographic floor, procedural support only, 2 m wide.
- A04 four forthcoming merchandise images, imagegen product photography, no UI in the images.

SHOT
- camera: WEB_CAM_product, orthographic or long lens to match the weak perspective.
- hero subject center x≈70%, y≈51%; width≈36%; ample copy area on left.
- about: large counterclockwise cardholder on left, readable complete lettering, copy on right.
- gallery: three views, consistently lit, fully in frame.
- key: standing, horizontal ACCESS, horizontal code, highlighted code; blade faces right when horizontal.

LOOK
- ivory leather, darker navy printing, muted nickel with long reflection gradients.
- independent leather pigment, scanned height/roughness and fine normal detail; current material parameters and limitations are recorded in the photorealism playbook.
- no emissive leather or ink; dielectric leather; metallic nickel.
- pearl white to cool blue-gray background without visible image boundaries.

LIGHTING
- focal subject: leather/engraving; deepest values: print, metallic side edge and shadow core.
- daylight upper right; broad source; weak camera-left bounce.
- floor shadows remain visible and soften with distance.
- metal receives a narrow reflection strip; no competing diffuse key.
- AgX exposure locked across variants; inspect key-only and combined lighting.

MOTION
- still images for the four user-requested states; sticky scrolling controls state transitions.
- keyboard-accessible step controls; reduced-motion behavior supported.

ACCEPTANCE
- all prior scene objects preserved; website scene active and visible in Blender.
- no CSS silhouette standing in for a product, clipped product, duplicated labels or placeholders in the catalog.
- no clipped whites or black stitch artifacts; coherent product/background shadow direction.
- one header, no Buy navigation item; gallery follows the key section.
- desktop/mobile screenshot review, gallery/cart interactions, build and runtime checks.

refs_read: frontend-design, agent-browser, imagegen, blender-scene, blender-scene-spec, blender-modeling, blender-lookdev, blender-lighting-camera, blender-audit-finalize.
