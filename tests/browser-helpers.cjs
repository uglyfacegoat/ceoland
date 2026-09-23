const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
const artifacts=process.env.ARTIFACT_DIR || path.join(require('node:os').tmpdir(),'ceoland-tests');
fs.mkdirSync(artifacts,{recursive:true});
const artifact=name=>path.join(artifacts,name);
const launch=()=>chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
module.exports={launch,artifact};
