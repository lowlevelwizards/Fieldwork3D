/** 8H: exact M98 master + same-cut, same-light mobile captures at three
 * candidate physical textile repeats (2.55, 3.0, 3.4).
 * The opt-in Lab parameter changes only this independent viewer page.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4197,origin='http://127.0.0.1:'+port;
const out='operator-8h-m98-density-comparison';
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
 if(!ready)throw Error('8H M98 density Lab could not start');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir(out,{recursive:true});
  let screenshots=0;
  for(const density of ['2.55','3.0','3.4']){
   const query=new URLSearchParams({
    camo:'norwegian-m98',camoChannel:'top',camoBoth:'1',
    top:'bdu-shirt',armor:'armor-bare',rig:'no-rig',
    zoom:'detail',view:'front',m98Scale:density
   });
   await page.goto(origin+'/operator-armor-rig-lab.html?'+query,
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(n=>{
    const el=document.getElementById('armorCanvas');
    return el?.dataset.ready==='true'&&el.dataset.camo==='norwegian-m98'
     &&Number(el.dataset.camoScale)===n;
   },Number(density),{timeout:25000});
   const metrics=await page.evaluate(async ()=>{
    const {FABRIC_CAMO_DENSITY}=await import('/src/operator-fabric-camo-materials.ts');
    const {headwearCamoPixels,headwearCamoSize}=await import('/src/operator-headwear-camo.ts');
    const size=headwearCamoSize('norwegian-m98');
    const pixels=headwearCamoPixels('norwegian-m98');
    const ctx=document.createElement('canvas').getContext('2d');
    if(!ctx)throw Error('Missing 8H swatch context');
    ctx.canvas.width=size;ctx.canvas.height=size;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),size,size),0,0);
    return {density:FABRIC_CAMO_DENSITY['norwegian-m98'],
      worldPeriod:size/FABRIC_CAMO_DENSITY['norwegian-m98'],
      swatch:ctx.canvas.toDataURL('image/png').split(',')[1]};
   });
   if(metrics.density!==Number(density))
    throw Error('8H preview density did not reach fabric renderer');
   if(density==='2.55'){
    await writeFile(out+'/m98-master-64px.png',Buffer.from(metrics.swatch,'base64'));
   }
   await writeFile(out+'/m98-density-'+density+'.json',
    JSON.stringify({density:metrics.density,worldPeriod:metrics.worldPeriod},null,2));
   for(const view of ['front','side','back']){
    await page.locator('button[data-view="'+view+'"]').click();
    for(const zoom of ['detail','gameplay']){
     await page.locator('#zoomChoice').selectOption(zoom);
     await page.waitForFunction(v=>{
      const el=document.getElementById('armorCanvas');
      return el?.dataset.view===v&&el.dataset.ready==='true';
     },view,{timeout:20000});
     await page.locator('#armorCanvas').screenshot({
      path:out+'/m98-density-'+density+'-'+view+'-'+zoom+'.png'
     });
     screenshots++;
    }
   }
  }
  if(errors.length)throw Error('8H WebGL errors: '+errors.join('; '));
  console.log('8H M98: 1 master, '+screenshots+
   ' fixed-light phone frames across 2.55 / 3.0 / 3.4 cloth density candidates');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
