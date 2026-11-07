/** Focused actual WebGL iPhone-size proof of the unified Operator Lab. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4197,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
const out='operator-lab-pose-captures';
await mkdir(out,{recursive:true});
async function ready(page){
 await page.waitForFunction(()=>{
  const c=document.getElementById('preview');
  return c?.dataset.ready==='true'||c?.dataset.ready==='error';
 },null,{timeout:30000});
 const d=await page.locator('#preview').evaluate(c=>({...c.dataset}));
 if(d.ready!=='true'||Number(d.drawCalls)<1)
  throw Error('Lab cannot render: '+JSON.stringify(d)+' / '+
   await page.locator('#labStatus').textContent());
 return d;
}
try{
 let live=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){live=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!live)throw Error('Vite operator-lab server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-lab.html?tab=poses',
   {waitUntil:'domcontentloaded'});
  await ready(page);
  if(!await page.locator('#poseWeapon').isVisible()||
    !await page.locator('#poseAnimation').isVisible())
   throw Error('Poses controls are hidden behind the old modal');
  if(await page.locator('#poseFitPanel').count())
   throw Error('Old Pose Fit overlay still exists');
  if(await page.locator('#poseWeapon').inputValue()!=='ar-m4a1')
   throw Error('Poses tab should start with M4A1');
  await page.locator('#poseAnimation').selectOption('low-ready');
  await page.screenshot({path:out+'/m4a1-low-ready-iphone.png'});
  await page.locator('#poseWeapon').selectOption('hk-mp5a3');
  await page.locator('#poseArmor').selectOption('plate-heavy');
  await page.locator('#poseRig').selectOption('full-chest');
  await page.locator('#poseUniform').selectOption('combat-shirt');
  await page.locator('#poseAnimation').selectOption('reload-emergency');
  await page.locator('#timeline').evaluate(e=>{
   e.value='1100';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.time==='1.100'&&d?.track==='reload-emergency'&&
    d?.poseFitWeapon==='hk-mp5a3'&&
    d?.poseFitArmor==='plate-heavy'&&d?.poseFitRig==='full-chest';
  },null,{timeout:15000});
  const result=await ready(page);
  await page.screenshot({path:out+'/mp5a3-heavy-reload-iphone.png'});
  await page.locator('#poseInspector').evaluate(e=>e.open=true);
  if(!(await page.locator('#poseInspectorReport').textContent())?.includes('GRIP'))
   throw Error('Integrated pose report not showing');
  await page.locator('#poseStrictContact').check();
  await ready(page);
  if(errors.length)throw Error('Runtime: '+errors.join('; '));
  console.log('Unified Operator Lab phone WebGL PASS',JSON.stringify({
   track:result.track,weapon:result.poseFitWeapon,
   armor:result.poseFitArmor,rig:result.poseFitRig,
   time:result.time,drawCalls:result.drawCalls,
   triangles:result.triangles}));
  await page.goto(origin+'/operator-lab.html?poseFit=1');
  await ready(page);
  if(!await page.locator('#poseWeapon').isVisible()||
    await page.locator('#poseWeapon').inputValue()!=='ar-m4a1')
   throw Error('Legacy Pose Fit URL no longer routes to unified Poses');
  // Arsenal R10: exact saved assembly in the actual iPhone-size WebGL rig.
  await page.evaluate(async()=>{
   const {initialWeaponConfiguration,selectWeaponFamilyPreset}=
    await import('/src/equipment-weapon-assemblies.ts');
   const {arsenalRecipeFromLegacy}=await import('/src/arsenal/recipes.ts');
   const base=selectWeaponFamilyPreset(initialWeaponConfiguration('smg'),'hk-mp5a3');
   const recipe=arsenalRecipeFromLegacy(base);
   if(!recipe)throw Error('Missing MP5 reference');
   recipe.parts.stock='hk-mp5-fixed-stock';
   localStorage.setItem('fieldwork3d.arsenal-recipes.v1',JSON.stringify({
    version:1,builds:[{id:'arsenal-1',name:'Saved MP5 Fixed',recipe}]
   }));
  });
  await page.goto(origin+'/operator-lab.html?tab=poses',
   {waitUntil:'domcontentloaded'});
  await ready(page);
  await page.locator('#poseSavedWeapon').selectOption('arsenal-1');
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseFitSavedWeapon==='arsenal-1'&&
    d?.poseFitWeaponReceiver==='hk-mp5-standard'&&
    d?.poseFitWeaponStock==='hk-mp5-fixed-stock';
  },null,{timeout:15000});
  await page.screenshot({path:out+'/saved-mp5-fixed-poses-iphone.png'});
  await page.locator('#poseWeapon').selectOption('ar-m4a1');
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseFitSavedWeapon===''&&d?.poseFitWeapon==='ar-m4a1';
  },null,{timeout:15000});
  // Arsenal R9 end-to-end: mobile gallery, saved build, compatible part
  // change, load review and undo. No Campaign ownership writes are involved.
  await page.goto(origin+'/arsenal.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Select MP5A3'}).click();
  await page.getByRole('button',{name:'OPEN WORKBENCH'}).click();
  await page.locator('.arsenal-wb-screen').waitFor();
  if(await page.locator('.arsenal-wb-viewport').getAttribute('data-webgl-unavailable'))
   throw Error('Arsenal 3D viewport could not initialize');
  await page.locator('.arsenal-wb-save').click();
  await page.locator('.arsenal-wb-save-dialog input').fill('R9 Mobile MP5');
  await page.locator('.arsenal-wb-save-dialog .arsenal-wb-accept').click();
  await page.waitForFunction(()=>localStorage.getItem(
   'fieldwork3d.arsenal-recipes.v1')?.includes('R9 Mobile MP5'));
  await page.locator('.arsenal-wb-category').filter({hasText:'Furniture'}).click();
  await page.locator('.arsenal-wb-subslot').filter({hasText:'Stock'}).click();
  await page.locator('.arsenal-wb-option').filter({hasText:'A2 Fixed'}).click();
  await page.waitForFunction(()=>document.querySelector(
   '.arsenal-wb-current')?.textContent?.includes('A2 Fixed'));
  await page.getByRole('button',{name:'LOAD BUILD'}).click();
  await page.locator('.arsenal-wb-load-option').filter({hasText:'R9 Mobile MP5'}).click();
  const review=await page.locator('.arsenal-wb-load-changes').textContent();
  if(!review?.includes('stock')||!review.includes('A3 Retractable'))
   throw Error('Saved recipe did not disclose the changed stock: '+review);
  await page.locator('.arsenal-wb-load-dialog .arsenal-wb-accept').click();
  await page.waitForFunction(()=>document.querySelector(
   '.arsenal-wb-current')?.textContent?.includes('A3 Retractable'));
  await page.screenshot({path:out+'/arsenal-saved-build-load-iphone.png'});
  await page.locator('.arsenal-wb-actions button').filter({hasText:'UNDO'}).click();
  await page.waitForFunction(()=>document.querySelector(
   '.arsenal-wb-current')?.textContent?.includes('A2 Fixed'));
  if(errors.length)throw Error('Arsenal runtime: '+errors.join('; '));
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
