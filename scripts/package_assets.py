"""Package only the deliverable assets, sources, previews, and verification reports."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
files = [
    "README.md",
    "assets/models/cardholder.glb",
    "assets/models/key.glb",
    "assets/models/manifest.json",
    "assets/models/gltf-validation.json",
    "assets/models/roundtrip-validation.json",
    "assets/models/key-shape-validation.json",
    "blender/cardholder.blend",
    "blender/key.blend",
    "blender/textures/leather-normal.png",
    "blender/textures/leather-roughness.png",
    "blender/textures/steel-normal.png",
    "blender/textures/steel-roughness.png",
    "previews/overview.png",
    "previews/cardholder-front.png",
    "previews/cardholder-straight.png",
    "previews/cardholder-detail.png",
    "previews/key-front.png",
    "previews/key-back.png",
    "previews/key-straight.png",
    "previews/key-detail.png",
    "previews/key-shape-check.png",
    "previews/cardholder-glb-check.png",
    "previews/key-glb-check.png",
    "scripts/build_models.py",
    "scripts/refine_models.py",
    "scripts/verify_models.py",
    "scripts/inspect_reference.py",
    "scripts/check_key_shape.py",
    "scripts/validate_gltf.cjs",
    "scripts/package_assets.py",
    "revisions/v1/cardholder.blend",
    "revisions/v1/key.blend",
    "revisions/v1/build_models.py",
    "revisions/v1/overview.png",
    "references/key-front-shape.png",
    "references/key-material.png",
    "references/cardholder-material.png",
    "references/key-profile.json",
]
for relative in files:
    if not (root / relative).is_file():
        raise FileNotFoundError(root / relative)

output = root / "ceo-3d-assets.zip"
with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for relative in files:
        archive.write(root / relative, relative)

with ZipFile(output) as archive:
    damaged = archive.testzip()
    if damaged is not None:
        raise RuntimeError(f"Archive verification failed: {damaged}")
    print(f"Verified archive: {len(archive.namelist())} files, {output.stat().st_size} bytes")
