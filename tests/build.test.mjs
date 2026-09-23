import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
test('build clears stale files and includes the API adapter, but no source archives',async()=>{
 const dist=new URL('dist/',root);await mkdir(dist,{recursive:true});await writeFile(new URL('old-unused.js',dist),'stale');
 execFileSync(process.execPath,['build.mjs'],{cwd:root});
 const files=await readdir(dist);assert(!files.includes('old-unused.js'));assert(!files.includes('docs'));assert(!files.includes('website'));assert(!files.includes('blender'));
 for(const file of ['runtime-config.js','integration/api.js','integration/store.js'])assert((await stat(new URL(file,dist))).isFile());
 const html=await readFile(new URL('app.html',dist),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"#?]+)"/g)){
  if(/^(data:|https?:)/.test(match[1]))continue;
  assert((await stat(new URL(match[1],dist))).isFile(),match[1]);
 }
});
