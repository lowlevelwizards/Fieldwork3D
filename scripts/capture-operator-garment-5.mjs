/** Reference-sized phone capture: identical light, zoom and pose for every
 * garment. Save all four views, using the real Studio and actual rig. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4197,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('Operator Studio unavailable for garment captures');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.ready==='true',
   null,{timeout:25000});
  await mkdir('operator-garment-captures',{recursive:true});
  // The garment silhouette has to be visible without an overlaid carrier
  // or helmet. The editor starts in clothing-only preview by default.
  if(await page.locator('#studioGearToggle').getAttribute('aria-pressed')!=='true')
   throw Error('Garment sheet must default to clothing-only inspection');
  const cuts=['combat-shirt','acu-shirt','smock-jacket','gorka-jacket'];
  for(const cut of cuts){
   const item=page.locator('[data-appearance-item="'+cut+'"]');
   await item.click({timeout:20000});
   // The source is intentionally neutral solid; don't let noisy camouflage
   // disguise cracks or shape errors during the silhouette pass.
   const swatch=page.locator('#studioMaterials .solid-swatches button').first();
   if(await swatch.isVisible())await swatch.click();
   for(const view of ['front','side','back','fit']){
    await page.locator('[data-studio-view="'+view+'"]').click();
    await page.waitForTimeout(130);
    await page.locator('#studioCanvas').screenshot({
     path:'operator-garment-captures/'+cut+'-'+view+'.png'});
   }
  }
  if(errors.length)throw Error('3D capture page errors: '+errors.join('; '));
  console.log('Captured 16 same-scale Studio garment views in phone portrait');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
