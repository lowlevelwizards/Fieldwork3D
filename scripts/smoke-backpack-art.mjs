/** BP6–9 full roster iPhone-size production-geometry preview capture matrix. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4199,origin='http://127.0.0.1:'+port,out='backpack-art-captures';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let live=false;
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/operator-lab.html')).ok){live=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!live)throw Error('Lab server unavailable');
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/operator-lab.html?tab=poses&packArtCapture=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.ready==='true',{},{timeout:45000});
 await page.locator('#poseArmor').selectOption('plate-jpc');
 await page.locator('#poseRig').selectOption('chest-placard');
 await page.locator('#poseUniform').selectOption('combat-shirt');
 await page.locator('#poseAnimation').selectOption('high-ready');
 const report=[];
 for(const [style,id] of [['hydration','hydration'],['admin-pack','assault-panel'],['day-pack','day-pack'],['assault-pack','assault-pack'],['field-pack','field-pack'],['rucksack','rucksack'],['medic-pack','medic-pack'],['comms-pack','comms-pack'],['civilian-pack','civilian-pack']]){
  await page.locator('#posePack').selectOption(style);
  await page.waitForFunction(id=>document.getElementById('preview')?.dataset.authoredPack===id,id,{timeout:20000});
  for(const view of ['game']){
   await page.locator('[data-lab-group="poses"] [data-view="'+view+'"]').click();
   await page.locator('#preview').screenshot({path:out+'/'+id+'-'+view+'.png'});
  }
  for(const view of ['back','side','iso','front','silhouette']){
   const png=await page.evaluate(view=>window.fieldworkCapturePack(view),view);
   await writeFile(out+'/'+id+'-'+view+'-native.png',Buffer.from(png.split(',')[1],'base64'));
  }
  report.push({id,data:await page.locator('#preview').evaluate(e=>({...e.dataset}))});
 }
 // A second real equipment combination for civilian, load-bearing and specialist fit.
 for(const [armor,rig,top,style] of [['armor-bare','no-rig','combat-shirt','civilian-pack'],['armor-bare','alice-lc2','combat-shirt','field-pack'],['plate-standard','full-chest','combat-shirt','rucksack'],['soft-vest','no-rig','combat-shirt','medic-pack'],['plate-jpc','chest-placard','combat-shirt','comms-pack']]){
  await page.locator('#poseArmor').selectOption(armor);
  await page.locator('#poseRig').selectOption(rig);
  await page.locator('#poseUniform').selectOption(top);
  await page.locator('#posePack').selectOption(style);
  await page.waitForFunction(id=>document.getElementById('preview')?.dataset.authoredPack===id,style,{timeout:20000});
  const png=await page.evaluate(()=>window.fieldworkCapturePack('iso'));
  await writeFile(out+'/'+style+'-alternate-native.png',Buffer.from(png.split(',')[1],'base64'));
 }
 // Screenshot-reported heavy/legacy armor cases and every compatible pack.
 for(const armor of ['armor-bare','soft-vest','soft-flak','plate-slick','plate-jpc','plate-standard','plate-heavy','plate-legacy']){
  await page.locator('#poseArmor').selectOption(armor);
  await page.locator('#poseRig').selectOption('full-chest');
  for(const style of ['hydration','day-pack','assault-pack','field-pack','rucksack','medic-pack','comms-pack','civilian-pack',...(['plate-jpc','plate-standard'].includes(armor)?['admin-pack']:[])]){
   await page.locator('#posePack').selectOption(style);
   await page.waitForFunction(([a,id])=>document.getElementById('preview')?.dataset.poseFitArmor===a&&document.getElementById('preview')?.dataset.authoredPack===id,[armor,style==='admin-pack'?'assault-panel':style],{timeout:20000});
   for(const view of ['side','above',...(['plate-heavy','plate-legacy'].includes(armor)?['front','back']:[])]){
    const png=await page.evaluate(view=>window.fieldworkCapturePack(view),view);
    await writeFile(out+'/contact-'+armor+'-'+style+'-'+view+'.png',Buffer.from(png.split(',')[1],'base64'));
   }
  }
 }
 await page.locator('#poseArmor').selectOption('armor-bare');
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.poseFitArmor==='armor-bare');
 if(!(await page.locator('#posePack option[value="admin-pack"]').evaluate(e=>e.disabled)))throw Error('Incompatible panel not disabled');
 // Actual Studio workflow: every new item available without issuing it;
 // change real rig colors, verify review is never a saved appearance edit.
 await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.ready==='true',{},{timeout:45000});
 await page.getByRole('button',{name:'Customize gear'}).click();
 await page.locator('#studioSubcategories button').filter({hasText:'PACK'}).click();
 for(const [style,id] of [['hydration','hydration'],['admin-pack','assault-panel'],['day-pack','day-pack'],['assault-pack','assault-pack'],['field-pack','field-pack'],['rucksack','rucksack'],['medic-pack','medic-pack'],['comms-pack','comms-pack'],['civilian-pack','civilian-pack']]){
  await page.locator('[data-appearance-item="'+style+'"]').click();
  await page.waitForFunction(id=>document.getElementById('studioCanvas')?.dataset.authoredPack===id,id,{timeout:20000});
  if(!await page.locator('#studioApply').isDisabled())throw Error('Review allowed save');
 }
 await page.locator('[data-appearance-item="day-pack"]').click();
 await page.locator('#studioWorkflow button[data-studio-step="materials"]').click();
 for(const [name,hex] of [['Black','292f2d'],['Coyote Brown','927557'],['Ranger Green','566a57']]){
  await page.locator('#studioMaterials .solid-swatches button').filter({hasText:name}).click();
  await page.waitForFunction(hex=>document.getElementById('studioCanvas')?.dataset.packReviewColor===hex,hex,{timeout:20000});
  await page.screenshot({path:out+'/studio-day-pack-'+hex+'.png'});
 }
 // Verify available mount controls on a real pack; exercise each offered
 // configuration (actual equipped armor/rig determines eligibility).
 await page.locator('#studioWorkflow button[data-studio-step="details"]').click();
 await page.locator('[data-pack-review-slot="armorStyle"]').selectOption('plate-jpc');
 await page.locator('[data-pack-review-slot="rigStyle"]').selectOption('split-front');
 await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.packMount==='direct');
 if(await page.locator('#studioMaterials [data-pack-mount]').count())throw Error('Redundant mount options');
 await page.locator('[data-pack-review-slot="armorStyle"]').selectOption('armor-bare');
 await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.packMount==='shared');
 await page.locator('[data-pack-review-slot="rigStyle"]').selectOption('no-rig');
 await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.packMount==='independent');
 await page.getByRole('button',{name:'Customize head'}).click();
 await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.packReview==='false');
 await writeFile(out+'/report.json',JSON.stringify({report,errors,studioReview:true},null,2));
 if(errors.length)throw Error(errors.join('; '));
}finally{await browser?.close();server.kill();}
