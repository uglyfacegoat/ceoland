import { build, loadEnv } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { renderRoute } from "../src/routes.ts";
import {
  pageMetadata,
  seoHead,
  siteOrigin,
  sitemapXml,
  robotsTxt,
} from "../src/seo.ts";

const root = resolve(import.meta.dirname, "..");
const env = { ...loadEnv("production", root, "VITE_"), ...process.env };
const origin = siteOrigin(env.VITE_SITE_URL);
if (process.argv.includes("--release") && !origin)
  throw new Error("Перед публикацией задайте VITE_SITE_URL в .env.production");
if (!origin)
  process.stdout.write("Preview build: домен не задан, индексация закрыта.\n");
await build({ root });
const output = join(root, "dist");
const template = await readFile(join(output, "index.html"), "utf8");
if (
  !template.includes("<!--app-head-->") ||
  !template.includes('<div id="app"></div>')
)
  throw new Error(
    "Шаблон HTML изменён: проверьте точки вставки пререндеринга.",
  );
for (const path of [...Object.keys(pageMetadata), "/404"]) {
  const html = template
    .replace("<!--app-head-->", seoHead(path, origin))
    .replace(
      '<div id="app"></div>',
      () => `<div id="app">${renderRoute(path)}</div>`,
    )
    .replace(
      "<body>",
      `<body${["/menu", "/request/sent"].includes(path) ? ' class="dark-page"' : ""}>`,
    );
  const destination = join(
    output,
    path === "/" ? "index.html" : `${path}.html`,
  );
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
}
await writeFile(join(output, "sitemap.xml"), sitemapXml(origin));
await writeFile(join(output, "robots.txt"), robotsTxt(origin));
process.stdout.write(
  `Prerendered ${Object.keys(pageMetadata).length} routes and 404.\n`,
);
