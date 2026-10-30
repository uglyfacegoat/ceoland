// Local static development/test server only; this is not the application backend.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import routing from './routing.js';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/vnd.microsoft.icon','.webmanifest':'application/manifest+json','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
export function createStaticServer(directory=new URL('.',import.meta.url)){
  const root=resolve(fileURLToPath(directory));
  return createServer(async(req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    try{
      const url=new URL(req.url,'http://localhost');
      const redirect=routing.redirect(url);
      if(redirect){res.writeHead(301,{Location:redirect});res.end();return;}
      let path=decodeURIComponent(url.pathname);
      if(routing.valid(path.slice(1)))path='/app.html';
      const file=resolve(root,'.'+(path==='/'?'/index.html':path));
      if(!file.startsWith(root+sep)||!types[extname(file)]){res.writeHead(404);res.end('Not found');return;}
      const body=await readFile(file);
      res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:body);
    }catch{res.writeHead(404);res.end('Not found');}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createStaticServer();
  server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`CEOMENTALITY: http://localhost:${server.address().port}`));
}
