/** WebGL validation of original-vs-compiled legacy shotgun geometry.
 * Render production primitives, compare GPU framebuffer pixels and record
 * actual render.calls; no fake render, no mocked WebGL canvas.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4283,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/arsenal-m30-shotgun-capture.html')).ok){
   ready=true;break;
  }}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 if(!ready)throw Error('M3.0 shotgun WebGL review page unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1020},
   deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+'/arsenal-m30-shotgun-capture.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.m30Complete==='true',
   null,{timeout:90000});
  const stats=await page.evaluate(()=>JSON.parse(
   document.body.dataset.m30Stats||'[]'));
  if(stats.length!==3)throw Error('Missing all three production views');
  for(const result of stats){
   if(result.originalCalls!==20||result.compiledCalls!==2||
    result.originalTriangles!==240||result.compiledTriangles!==240||
    result.differingPixels>result.width*result.height*.002||
    result.meanRgbDelta>.02)
    throw Error('Draw or visual regression: '+JSON.stringify(result));
  }
  if(errors.length)throw Error('WebGL errors: '+errors.join(' | '));
  await mkdir('reports',{recursive:true});
  const screenshot=await page.screenshot({
   path:'reports/arsenal-m30-shotgun-parity.png',
   fullPage:true,animations:'disabled'});
  if(screenshot.length<14000)throw Error('Blank M3.0 visual comparison');
  await writeFile('reports/arsenal-m30-shotgun-parity.json',
   JSON.stringify(stats,null,2)+'\n');
  console.log('M3.0 shotgun real WebGL before/after:',JSON.stringify(stats));
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
