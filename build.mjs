import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
const output = new URL('./dist/', import.meta.url);
// Always rebuild from a clean output: removed files must not survive deployment.
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
const files = ['index.html','app.html','site.css','wallet-media.css','site.js','documents.js','styles.css','typography.css','main.js','typography.js','loader.css','loader.js','runtime-config.js'];
for (const name of files) await copyFile(new URL(name, import.meta.url), new URL(name, output));
for (const folder of ['assets','integration']) {
  await mkdir(new URL(folder+'/',output));
  for (const entry of await readdir(new URL('./'+folder+'/',import.meta.url),{withFileTypes:true})) {
    if (entry.isFile()) await copyFile(new URL(folder+'/'+entry.name,import.meta.url),new URL(folder+'/'+entry.name,output));
  }
}
console.log('Static website built in dist/');
