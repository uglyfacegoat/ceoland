import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../server.mjs';
let server;
try{
  let url=process.env.SITE_URL;
  if(!url){
    server=createStaticServer(new URL('../dist/',import.meta.url));
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    url=`http://127.0.0.1:${server.address().port}`;
  }
  for(const file of ['site-browser.cjs','api-browser.cjs']){
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[fileURLToPath(new URL(file,import.meta.url))],{stdio:'inherit',env:{...process.env,SITE_URL:url}});
      child.once('error',reject);child.once('exit',resolve);
    });
    if(code!==0)throw new Error(file+' failed');
  }
}finally{if(server)await new Promise(resolve=>server.close(resolve));}
