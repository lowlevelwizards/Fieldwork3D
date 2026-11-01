/** Developer-only deterministic 132-asset capture sweep.
 * Outputs categorized iso/top page contact sheets plus machine review manifest.
 * npm install --no-save playwright && npx playwright install chromium
 * node scripts/capture-asset-contact-sheets.mjs
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assetReviewInventory} from '../src/worldgen/asset-review.ts';
const root=resolve('asset-art-audit');
await mkdir(root,{recursive:true});
const manifest=assetReviewInventory();
await writeFile(resolve(root,'inventory.json'),JSON.stringify({
 generatedAt:new Date().toISOString(),assetCount:manifest.length,items:manifest},null,2));
const {chromium}=await import('playwright');
const port=4198,url=`http://127.0.0.1:${port}/asset-lab.html`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(url)).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,170));
 }
 if(!ready)throw Error('Asset Lab preview unavailable');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1040,height:900},deviceScaleFactor:1});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#labels button').first().waitFor();
 const categories=await page.locator('#category option').evaluateAll(opts=>opts.map(o=>({value:o.value,name:o.textContent})));
 let captures=0;
 for(const category of categories){
  await page.locator('#category').selectOption(category.value);
  const categoryName=(category.value||'all').replace(/[^a-z0-9-]/gi,'_');
  const folder=resolve(root,categoryName);await mkdir(folder,{recursive:true});
  let pages=0;
  do{
   for(const mode of ['iso','top']){
    await page.locator('#'+mode).click();
    await page.waitForTimeout(160);
    await page.screenshot({path:resolve(folder,`page-${String(pages+1).padStart(2,'0')}-${mode}.png`)});
    captures++;
   }
   pages++;
   if(await page.locator('#next').isDisabled())break;
   await page.locator('#next').click();
  }while(pages<100);
 }
 await writeFile(resolve(root,'capture-report.json'),JSON.stringify({captures,categories:categories.length},null,2));
}finally{await browser?.close();server.kill('SIGTERM');}
