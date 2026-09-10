import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(root, "website/public/images/editorial");
mkdirSync(output, { recursive: true });

const images = [
  ["key-still", "previews/photo-mobile/key.png", [480, 960, 1448]],
  [
    "product-original",
    "references/product-photos/client-white-front.png",
    [1254],
  ],
  ...["hoodie", "cap", "tshirt", "thermos"].map((name) => [
    name,
    `previews/website-archive/images/studio/${name}.png`,
    [480, 720],
  ]),
];

for (const [name, source, widths] of images) {
  for (const width of widths) {
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        resolve(root, source),
        "-vf",
        `scale=${width}:-1:flags=lanczos`,
        "-frames:v",
        "1",
        "-c:v",
        "libwebp",
        "-quality",
        name === "product-original" ? "96" : "92",
        "-compression_level",
        "6",
        resolve(output, `${name}-${width}.webp`),
      ],
      { stdio: "inherit" },
    );
  }
}
