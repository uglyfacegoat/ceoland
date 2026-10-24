import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
const output = new URL('./dist/', import.meta.url);
// Always rebuild from a clean output: removed files must not survive deployment.
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
const files = ['index.html','app.html','site.css','wallet-media.css','site.js','site-shell.js','footer.css','documents.js','favicon.ico','apple-touch-icon.png','favicon.svg','safari-pinned-tab.svg','site.webmanifest','browserconfig.xml','styles.css','typography.css','main.js','typography.js','hero-variants.js','hero-variants-extra-a.js','hero-variants-extra-b.js','hero-variants-extra-c.js','loader.css','loader.js','runtime-config.js'];
for (const name of [...files,'routing.js']) await copyFile(new URL(name, import.meta.url), new URL(name, output));
for (const folder of ['assets','integration','legal']) await cp(new URL(folder+'/',import.meta.url),new URL(folder+'/',output),{recursive:true});
console.log('Static website built in dist/');
