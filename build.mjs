import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const output = new URL('./dist/', import.meta.url);
// Always rebuild from a clean output: removed files must not survive deployment.
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
const files = ['index.html','app.html','site.css','wallet-media.css','site.js','site-shell.js','footer.css','documents.js','favicon.ico','apple-touch-icon.png','favicon.svg','safari-pinned-tab.svg','site.webmanifest','browserconfig.xml','styles.css','typography.css','main.js','typography.js','hero-variants.js','hero-variants-extra-a.js','hero-variants-extra-b.js','hero-variants-extra-c.js','loader.css','loader.js','runtime-config.js'];
for (const name of [...files,'routing.js']) await copyFile(new URL(name, import.meta.url), new URL(name, output));
for (const folder of ['assets','integration','legal']) await cp(new URL(folder+'/',import.meta.url),new URL(folder+'/',output),{recursive:true});

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const hashed = (content, ext) => `bundle.${createHash('sha256').update(content).digest('hex').slice(0, 10)}.${ext}`;
const stylesheet = /[ \t]*<link rel="stylesheet" href="([^"]+)">\n?/g;
const deferred = /[ \t]*<script src="([^"]+)" defer><\/script>\n?/g;
// Kept as its own file: the Docker build rewrites it with sed and nginx serves it no-store.
const separate = 'runtime-config.js';
for (const page of ['index.html','app.html']) {
  const url = new URL(page, output);
  let html = await readFile(url, 'utf8');

  // First paint must not wait for five stylesheet requests: loader.css goes inline
  // (the loading screen shows as soon as HTML arrives), the rest is one file whose
  // name carries a content hash, so the 30-day immutable cache cannot serve stale CSS.
  const hrefs = [...html.matchAll(stylesheet)].map(match => match[1]);
  const inlineCss = (await Promise.all(hrefs.filter(href => href === 'loader.css').map(read))).join('\n');
  const css = (await Promise.all(hrefs.filter(href => href !== 'loader.css').map(read))).join('\n');
  const cssName = hashed(css, 'css');
  await writeFile(new URL(cssName, output), css);
  let cssPlaced = false;
  html = html.replace(stylesheet, () => {
    if (cssPlaced) return '';
    cssPlaced = true;
    return (inlineCss ? `  <style>${inlineCss}</style>\n` : '') + `  <link rel="stylesheet" href="${cssName}">\n`;
  });

  // One request instead of a dozen on HTTP/1.1. The loader goes first so the intro
  // starts before the heavy hero setup. Each file keeps its own try/catch, so one
  // failing script does not stop the rest, as with separate tags.
  const sources = [...html.matchAll(deferred)].map(match => match[1]).filter(src => src !== separate);
  sources.sort((a, b) => (b === 'loader.js') - (a === 'loader.js'));
  const parts = await Promise.all(sources.map(async src => `/* ${src} */\ntry {\n${await read(src)}\n} catch (error) { setTimeout(() => { throw error; }); }\n`));
  const js = parts.join('');
  const jsName = hashed(js, 'js');
  await writeFile(new URL(jsName, output), js);
  const hasConfig = html.includes(`<script src="${separate}" defer></script>`);
  let jsPlaced = false;
  html = html.replace(deferred, () => {
    if (jsPlaced) return '';
    jsPlaced = true;
    return (hasConfig ? `  <script src="${separate}" defer></script>\n` : '') + `  <script src="${jsName}" defer></script>\n`;
  });
  await writeFile(url, html);
}
console.log('Static website built in dist/');
