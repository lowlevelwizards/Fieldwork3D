/** S1 reference-grade eleven-choice headwear comparison.
 * Read-only appearance capture: no gameplay, source models or assets mutated.
 * Headwear catalog currently exposes eleven top-level models after the three
 * ACH/MICH cuts are treated as one family. Capture from the same viewport,
 * camera presets, default body, lighting and backdrop.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4291,base='http://127.0.0.1:'+port;
const out=process.env.HEADWEAR_S1_CAPTURE_DIR??'headwear-s1-eleven-captures';
const faces=['front','side','back','fit'];
const cases=[
 ['bare','Uncovered',null],
 ['patrol-cap','Patrol cap','Olive Drab'],
 ['boonie','Boonie hat','Olive Drab'],
 ['beanie','Beanie','Olive Drab'],
 ['beret','Military beret','Olive Drab'],
 ['soviet-steel','SSh-40 steel helmet','Soviet 4BO Green'],
 ['pasgt','PASGT','Olive Drab'],
 ['ach','Ballistic (ACH full-cut)','Olive Drab'],
 ['m1-steel','M1 steel helmet','Olive Drab'],
 ['ddr-m56','East German M56','Postwar Green'],
 ['police-helmet','Protective police helmet','Charcoal']
];
const server=spawn(process.execPath,
 ['node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'],{stdio:'ignore'});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
try{
 let ready=false;
 for(let i=0;i<130;i++){
  try{if((await fetch(base+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await sleep(140);
 }
 if(!ready)throw Error('S1 Studio server unavailable');
 await mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:430,height:920},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('studioCanvas')?.
   dataset.ready==='true',null,{timeout:45000});
  await page.getByRole('button',{name:'Customize head'}).click();
  const items=page.locator('#studioWorkflow [data-studio-step="items"]'),
   materials=page.locator('#studioWorkflow [data-studio-step="materials"]'),
   stage=page.locator('.studio-stage');
  const records=[];
  // Do not change gear, skin, weapons, camera distance, zoom or lighting
  // between items. Supported contextual headwear colors are the nearest
  // muted comparables; police helmet cannot use olive and is charcoal.
  for(const [id,label,color] of cases){
   await items.click();
   const item=page.locator('[data-appearance-item="'+id+'"]');
   await item.scrollIntoViewIfNeeded();await item.click();
   if(color){
    await materials.click();
    const colorControl=page.locator('#studioMaterials .material-group')
     .filter({hasText:/HEADGEAR FINISH|PASGT SHELL COLOR|ACH \/ MICH SHELL COLOR/})
     .getByRole('button',{name:color,exact:true}).first();
    await colorControl.click();
    // Make bare helmet shape comparisons: no cover even if cached state.
    if(id==='pasgt'||id==='ach'){
     const grp=page.locator('#studioMaterials .material-group')
      .filter({hasText:id==='pasgt'?'PASGT CLOTH COVER':'ACH / MICH COVER'});
     await grp.locator('select').first().selectOption('none');
    }
   }
   if(id==='m1-steel'){
    await page.locator('#studioWorkflow [data-studio-step="details"]').click();
    const cover=page.locator('.material-group').filter({hasText:'M1 HELMET COVER'});
    await cover.locator('select').first().selectOption('none');
   }
   for(const view of faces){
    await page.locator('[data-studio-view="'+view+'"]').click();
    await sleep(220);
    const calls=Number(await page.locator('#studioCanvas')
     .evaluate(el=>el.dataset.drawCalls||0));
    if(calls<=0)throw Error('No WebGL draw calls: '+id+' '+view);
    const file=id+'-'+view+'.png';
    await stage.screenshot({path:out+'/'+file});
    records.push({file,id,label,view,drawCalls:calls,color:color??'none'});
   }
  }
  if(errors.length)throw Error('Studio page error: '+errors.join(' | '));
  await writeFile(out+'/manifest.json',JSON.stringify({
   description:'11 actual top-level catalog headgear choices; ACH/MICH cuts are one family',
   viewport:'430x920 @2 DPR',angles:faces,
   equivalentKit:true,sameLighting:true,sameCamera:true,
   neutralColorPolicy:'nearest allowed muted solid per item',
   records
  },null,2));
  console.log('HEADWEAR S1 COMPARISON COMPLETE',records.length,'screenshots');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
