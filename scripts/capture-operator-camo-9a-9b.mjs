/** 9A/9B fixed-light source-master and actual-clothing mobile review.
 * Only one Chromium workflow for all eight designs. Compare identical
 * 390x844 phone frames at detail + tactical zoom, front + rear BDU/ACU.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4196,origin='http://127.0.0.1:'+port,out='operator-camo-9a-9b-review';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let n=0;n<100;n++){
  try{if((await fetch(origin+'/operator-armor-rig-lab.html')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,160));
 }
 if(!ready)throw Error('9A/9B review lab server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>{if(errors.length<2)console.error('9A/9B browser stack',e.stack||e.message);errors.push(e.message);});
  await mkdir(out,{recursive:true});
  const catalog=[
   ['french-cce','bdu'],['russian-vsr93','bdu'],['swiss-taz90','bdu'],
   ['british-desert-dpm','bdu'],['south-korean-granite-b','acu'],
   ['indonesian-kopassus-flowing-blood','bdu'],['cadpat-ar','acu'],['usaf-abu','acu']
  ];
  let shots=0;
  for(const [id,cut] of catalog){
   const query=new URLSearchParams({
    camo:id,camoChannel:'top',camoBoth:'1',camoCut:cut,
    top:cut==='acu'?'acu-shirt':'bdu-shirt',
    armor:'armor-bare',rig:'no-rig',zoom:'detail',view:'front'
   });
   await page.goto(origin+'/operator-armor-rig-lab.html?'+query,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(id=>{
    const el=document.getElementById('armorCanvas');
    return el?.dataset.ready==='true'&&el.dataset.camo===id
     &&el.dataset.armor==='armor-bare';
   },id,{timeout:25000});
   const base64=await page.evaluate(async id=>{
    const {headwearCamoPixels,headwearCamoSize}=
     await import('/src/operator-headwear-camo.ts');
    const w=headwearCamoSize(id),data=headwearCamoPixels(id);
    const c=document.createElement('canvas');c.width=c.height=w;
    const context=c.getContext('2d');
    if(!context)throw Error('No swatch render context');
    context.putImageData(new ImageData(new Uint8ClampedArray(data),w,w),0,0);
    return c.toDataURL('image/png').split(',')[1];
   },id);
   await writeFile(out+'/'+id+'-master.png',Buffer.from(base64,'base64'));
   for(const view of ['front','back']){
    await page.locator('button[data-view="'+view+'"]').click();
    for(const zoom of ['detail','gameplay']){
     await page.locator('#zoomChoice').selectOption(zoom);
     await page.waitForFunction(v=>document.getElementById('armorCanvas')?.dataset.view===v,
      view,{timeout:15000});
     await page.locator('#armorCanvas').screenshot({path:out+'/'+id+'-'+view+'-'+zoom+'.png'});
     shots++;
    }
   }
  }
  if(errors.length)throw Error('9A/9B WebGL failures: '+errors.join('; '));
  console.log('9A/9B complete: 8 source masters and '+shots+' mobile operator frames');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
