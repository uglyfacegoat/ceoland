// Asset generation only: requires ImageMagick 7; no image tooling ships to users.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const logo=await readFile(new URL('assets/wordmark.svg',root),'utf8');
const glyph=logo.match(/<path d="([^"]+)"/)[1];
const svg=(scale,background=true)=>{
 const x=(64-9.982*scale)/2,y=(64-11.1654*scale)/2;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${background?'<rect width="64" height="64" fill="#2451b2"/>':''}<path d="${glyph}" transform="translate(${x} ${y}) scale(${scale})" fill="${background?'#fff':'#000'}"/></svg>\n`;
};
const run=args=>execFileSync('magick',[...args.slice(0,-1),'-strip','-depth','8',args.at(-1)],{cwd:fileURLToPath(root)});
await mkdir(new URL('assets/icons/',root),{recursive:true});
await writeFile(new URL('favicon.svg',root),svg(4.3));
await writeFile(new URL('assets/icons/maskable.svg',root),svg(3.2));
await writeFile(new URL('safari-pinned-tab.svg',root),svg(4.3,false));
run(['-background','none','-density','768','favicon.svg','-resize','512x512','assets/icons/icon-512.png']);
for(const size of [16,32,48,96,120,144,150,152,167,180,192,256]){
 run(['assets/icons/icon-512.png','-resize',`${size}x${size}`,`assets/icons/icon-${size}.png`]);
}
run(['-background','none','-density','768','assets/icons/maskable.svg','-resize','512x512','assets/icons/maskable-512.png']);
await copyFile(new URL('assets/icons/icon-180.png',root),new URL('apple-touch-icon.png',root));
run(['assets/icons/icon-16.png','assets/icons/icon-32.png','assets/icons/icon-48.png','assets/icons/icon-256.png','favicon.ico']);
// Preserve BMP frames for older favicon readers; compress the large frame as PNG.
const ico=await readFile(new URL('favicon.ico',root));
const lastEntry=6+(ico.readUInt16LE(4)-1)*16;
const png=await readFile(new URL('assets/icons/icon-256.png',root));
const compact=Buffer.concat([ico.subarray(0,ico.readUInt32LE(lastEntry+12)),png]);
compact.writeUInt32LE(png.length,lastEntry+8);
await writeFile(new URL('favicon.ico',root),compact);
console.log('Generated browser, Apple, Android, maskable and Windows icons from the brand C glyph.');
