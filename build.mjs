import { mkdir, copyFile, readdir } from 'node:fs/promises';
const output = new URL('./dist/', import.meta.url);
await mkdir(new URL('assets/', output), { recursive: true });
for (const name of ['index.html', 'app.html', 'site.css', 'wallet-media.css', 'journey.css', 'site.js', 'documents.js', 'styles.css', 'typography.css', 'main.js', 'typography.js', 'loader.css', 'loader.js']) {
  await copyFile(new URL(name, import.meta.url), new URL(name, output));
}
for (const entry of await readdir(new URL('./assets/', import.meta.url), { withFileTypes: true })) {
  if (entry.isFile()) await copyFile(new URL(`assets/${entry.name}`, import.meta.url), new URL(`assets/${entry.name}`, output));
}
console.log('Static landing built in dist/');
