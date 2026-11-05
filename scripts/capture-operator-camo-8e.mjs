/** 8E read-only fixed-light WebGL comparison: 64px masters and matching
 * BDU jacket/trousers, at detail/gameplay zoom and all three orthogonal views.
 * No wardrobe save, external assets or production path modifications.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4198,origin='http://127.0.0.1:'+port;
const out='operator-8e-camo-comparison';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let n=0;n<100;n++){
  try{if((await fetch(origin+'/operator-armor-rig-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!ready)throw Error('Camouflage 8E mobile comparison Lab failed to launch');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir(out,{recursive:true});
  const prints=['norwegian-m98','jgsdf-type2','south-african-s2000'];
  let screenshots=0;
  for(const id of prints){
   const query=new URLSearchParams({
    camo:id,camoChannel:'top',camoBoth:'1',
    top:'bdu-shirt',armor:'armor-bare',rig:'no-rig',
    zoom:'detail',view:'front'
   });
   await page.goto(origin+'/operator-armor-rig-lab.html?'+query,
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(id=>{
    const el=document.getElementById('armorCanvas');
    return el?.dataset.ready==='true'&&el.dataset.camo===id
     &&el.dataset.armor==='armor-bare';
   },id,{timeout:25000});
   const master=await page.evaluate(async id=>{
    const {headwearCamoPixels,headwearCamoSize}=
     await import('/src/operator-headwear-camo.ts');
    const size=headwearCamoSize(id),data=headwearCamoPixels(id);
    const canvas=document.createElement('canvas');
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Missing swatch 2D context');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data),size,size),0,0);
    return canvas.toDataURL('image/png').split(',')[1];
   },id);
   await writeFile(out+'/'+id+'-master-64px.png',Buffer.from(master,'base64'));
   for(const view of ['front','side','back']){
    await page.locator('button[data-view="'+view+'"]').click();
    for(const zoom of ['detail','gameplay']){
     await page.locator('#zoomChoice').selectOption(zoom);
     await page.waitForFunction(v=>{
      const el=document.getElementById('armorCanvas');
      return el?.dataset.view===v&&el.dataset.ready==='true';
     },view,{timeout:20000});
     await page.locator('#armorCanvas').screenshot({
      path:out+'/'+id+'-'+view+'-'+zoom+'.png'
     });
     screenshots++;
    }
   }
  }
  if(errors.length)throw Error('Camouflage 8E WebGL errors: '+errors.join('; '));
  console.log('8E authored patterns: 3 original 64px masters and '+screenshots+
   ' fixed-light phone captures (BDU top+trousers; 3 views × 2 zooms).');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
