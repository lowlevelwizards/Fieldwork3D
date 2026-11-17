/** M3.0C5B real shared-builder default WebGL accept/reject, not a mock rendering.
 * Uses two production-built bodies, same lighting, same camera and actual
 * renderer.readRenderTargetPixels. Opt-in compiler remains off in gameplay.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4287,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/arsenal-m30c5-factory-capture.html?phase=runtime')).ok){
   ready=true;break;
  }}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 if(!ready)throw Error('M3.0C5B modular production comparison page unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1050},
   deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+'/arsenal-m30c5-factory-capture.html?phase=runtime',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.m30C5LiveComplete==='true',
   null,{timeout:90000});
  const stats=await page.evaluate(()=>JSON.parse(
   document.body.dataset.m30C5LiveStats||'[]'));
  if(stats.length!==12||new Set(stats.map(x=>x.id)).size!==4||
   new Set(stats.map(x=>x.view)).size!==3)
   throw Error('Not all 4 candidate weapons × 3 views rendered');
  for(const entry of stats){
   const visibleSaving=entry.originalCalls-entry.compiledCalls;
   const expected={'ak-ak74':9,'ak-aks74':9,'ak-rpk74':9,'ar-m16a4':8};
   if(entry.predictedSaved!==expected[entry.id])
    throw Error('Factory candidate did not match ranked audit: '+JSON.stringify(entry));
   if(entry.predictedSaved<5||visibleSaving<3||
    visibleSaving>entry.predictedSaved||
    entry.originalTriangles<=0||
    entry.compiledTriangles!==entry.originalTriangles||
    !Number.isFinite(entry.meanRgbDelta)||
    entry.differingPixels>entry.width*entry.height*.001||
    entry.meanRgbDelta>.025||
    entry.magazineMeshes<1||entry.anchors!==6)
    throw Error('Modular art, GPU draw, magazine or picking regression: '+
     JSON.stringify(entry));
  }
  if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
  await mkdir('reports',{recursive:true});
  const screenshot=await page.screenshot({
   path:'reports/arsenal-m30c5-runtime-parity.png',
   fullPage:true,animations:'disabled'});
  if(screenshot.length<14000)throw Error('Blank modular comparison');
  await writeFile('reports/arsenal-m30c5-runtime-parity.json',
   JSON.stringify(stats,null,2)+'\n');
  console.log('M3.0C5B WebGL original/compiled modular trials:',
   JSON.stringify(stats));
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
