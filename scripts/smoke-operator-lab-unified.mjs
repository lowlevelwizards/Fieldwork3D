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
 const browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{})});
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
  // Sidearms share the SAME real operator rig and seekable timeline.
  await page.locator('#poseWeapon').selectOption('glock-g19-gen3');
  await page.locator('#poseAnimation').selectOption('pistol-draw');
  await page.locator('#timeline').evaluate(e=>{
   e.value='850';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseSidearm==='glock-g19-gen3'&&
    Number(d.poseSidearmFraction)>.6&&d.poseSidearmMesh==='true'&&
    d.posePrimaryHidden==='true';
  },null,{timeout:15000});
  await page.screenshot({path:out+'/glock-draw-iphone.png'});
  // The reported regression was in the READY tab, not the pistol-only
  // drop-down. Exercise those actual phone buttons on a selected Glock.
  const topWeaponLabel=await page.locator('#weapon option:checked').textContent();
  if(topWeaponLabel!=='PISTOL PREVIEW')
   throw Error('Pistol inspection still claims NO WEAPON: '+topWeaponLabel);
  const initialPistol=await ready(page);
  if(Math.abs(Number(initialPistol.poseSidearmScale)-.57)>.001)
   throw Error('Expected slightly oversized, reduced pistol size');
  if(initialPistol.poseSidearmExtraDigits!=='false')
   throw Error('Pistol has unwanted additional finger geometry');
  await page.locator('[data-lab-tab="ready"]').click();
  await page.locator('[data-pose="low-ready"]').click();
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseSidearmStance==='low'&&Number(d.poseSidearmPitch)<-.25;
  },null,{timeout:15000});
  const lowHand=Number((await ready(page)).poseSidearmHandY);
  await page.screenshot({path:out+'/glock-pistol-low-ready-iphone.png'});
  await page.locator('[data-pose="high-ready"]').click();
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseSidearmStance==='high'&&Number(d.poseSidearmPitch)>.35;
  },null,{timeout:15000});
  const highFrame=await ready(page);
  const highHand=Number(highFrame.poseSidearmHandY);
  if(highHand-lowHand<4)
   throw Error('HIGH and LOW ready still look the same: '+
    JSON.stringify({lowHand,highHand}));
  await page.screenshot({path:out+'/glock-pistol-high-ready-iphone.png'});
  await page.locator('[data-pose="ready"]').click();
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.track==='ready'&&d?.poseSidearmStance==='ready';
  },null,{timeout:15000});
  const readyHand=Number((await ready(page)).poseSidearmHandY);
  if(readyHand-lowHand<2||highHand-readyHand<1.5)
   throw Error('Readiness levels no longer stack naturally: '+
    JSON.stringify({lowHand,readyHand,highHand}));
  await page.screenshot({path:out+'/glock-pistol-raised-ready-iphone.png'});
  await page.locator('[data-pose="active-aim"]').click();
  await page.locator('#timeline').evaluate(e=>{
   e.value='1450';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.track==='active-aim'&&d?.poseSidearmStance==='ready'&&
    d?.poseSidearmScale==='0.570';
  },null,{timeout:15000});
  const adsRecord=await ready(page);
  const adsHand=Number(adsRecord.poseSidearmHandY);
  if(Number(adsRecord.poseSidearmSupportAhead)<.7)
   throw Error('Support palm remains behind firing wrist: '+
    adsRecord.poseSidearmSupportAhead);
  if(adsRecord.poseSidearmExtraDigits!=='false')
   throw Error('Pistol ADS unexpectedly has extra finger/thumb meshes');
  if(Number(adsRecord.poseSidearmGripError)>.25)
   throw Error('Actual trigger grip missed firing wrist: '+
    adsRecord.poseSidearmGripError);
  if(adsHand-highHand<1.5)
   throw Error('ADS does not raise and extend firing wrist: '+
    JSON.stringify({lowHand,adsHand}));
  await page.screenshot({path:out+'/glock-pistol-ads-iphone.png'});
  await page.locator('[data-pose="point-shoot"]').click();
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.track==='point-shoot'&&Number(d.poseSidearmAim)<.45;
  },null,{timeout:15000});
  const pointHand=Number((await ready(page)).poseSidearmHandY);
  if(adsHand-pointHand<1.5)
   throw Error('Point shoot looks like eye-line ADS: '+
    JSON.stringify({adsHand,pointHand}));
  await page.screenshot({path:out+'/glock-pistol-low-point-shoot-iphone.png'});
  await page.locator('[data-pose="short-stock"]').click();
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseSidearmStance==='retention';
  },null,{timeout:15000});
  const retained=await ready(page);
  if(retained.poseSidearmExtraDigits!=='false')
   throw Error('Close retention added forbidden finger/thumb geometry');
  if(Number(retained.poseSidearmSupportAhead)>-.5)
   throw Error('Close retention support wrist not tucked back');
  // From both sides the free hand stays in front of the left chest and
  // the pistol stays right of the sternum, with both elbows hanging low.
  if(Number(retained.poseSidearmSupportLocalZ)>-5.5||
     Number(retained.poseSidearmFiringLocalZ)<5.5)
   throw Error('Close retention arms cross the chest: '+
    JSON.stringify({left:retained.poseSidearmSupportLocalZ,
     right:retained.poseSidearmFiringLocalZ}));
  if(Number(retained.poseSidearmSupportLocalX)<6.7||
     Number(retained.poseSidearmFiringLocalX)>8.8)
   throw Error('Close retention hands inside vest or pistol not retracted: '+
    JSON.stringify({left:retained.poseSidearmSupportLocalX,
     right:retained.poseSidearmFiringLocalX}));
  await page.screenshot({path:out+'/glock-pistol-close-retention-iphone.png'});
  await page.locator('[data-lab-tab="poses"]').click();
  await page.locator('#poseAnimation').selectOption('pistol-reload-retention');
  await page.locator('#timeline').evaluate(e=>{
   e.value='1100';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.track==='pistol-reload-retention'&&
    Number(d.poseSidearmReload)>.2&&d.poseSidearmMesh==='true';
  },null,{timeout:15000});
  await page.screenshot({path:out+'/glock-pistol-reload-iphone.png'});
  await page.locator('#poseAnimation').selectOption('pistol-reload-emergency');
  await page.locator('#timeline').evaluate(e=>{
   e.value='1950';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.track==='pistol-reload-emergency'&&
    Number(d.poseSidearmRack)>.5&&Number(d.poseSidearmReload)>.7;
  },null,{timeout:15000});
  const grab=await ready(page);
  await page.screenshot({path:out+'/glock-empty-reload-slide-grab-iphone.png'});
  await page.locator('#timeline').evaluate(e=>{
   e.value='2130';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return Number(d?.poseSidearmRackPull)>.5;
  },null,{timeout:15000});
  const rack=await ready(page);
  if(Math.abs(Number(rack.poseSidearmSupportX)-
    Number(grab.poseSidearmSupportX))<.45)
   throw Error('Empty reload did not visibly pull slide-hand rearward: '+
    JSON.stringify({grab:grab.poseSidearmSupportX,
     pull:rack.poseSidearmSupportX}));
  await page.screenshot({path:out+'/glock-empty-reload-slide-rack-iphone.png'});
  await page.locator('#timeline').evaluate(e=>{
   e.value='2600';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>{
   const d=document.getElementById('preview')?.dataset;
   return d?.poseSidearmRack===''&&d?.poseSidearmReload==='';
  },null,{timeout:15000});
  await page.screenshot({path:out+'/glock-empty-reload-regrip-iphone.png'});
  for(const model of ['beretta-m9','beretta-m9a3']){
   await page.locator('#poseWeapon').selectOption(model);
   await page.locator('#poseAnimation').selectOption('pistol-high-ready');
   await page.waitForFunction(id=>{
    const d=document.getElementById('preview')?.dataset;
    return d?.poseSidearm===id&&d.poseSidearmArtOnly==='true'&&
     d.poseSidearmMesh==='true'&&d.posePrimaryHidden==='true';
   },model,{timeout:15000});
   const beretta=await ready(page);
   if(Number(beretta.poseSidearmGripError)>.25)
    throw Error('Beretta grip socket misses the firing hand: '+model);
   if(beretta.poseSidearmExtraDigits!=='false')
    throw Error('Extra fingers returned on Beretta: '+model);
   if(!(await page.locator('#poseSidearmHint').textContent())?.includes('ART-ONLY'))
    throw Error('Beretta preview was misrepresented as playable: '+model);
   await page.screenshot({path:out+'/'+model+'-high-ready-iphone.png'});
  }
  // Restore primary weapon for the existing long-gun contact audit.
  await page.locator('#poseWeapon').selectOption('hk-mp5a3');
  await page.locator('#poseAnimation').selectOption('reload-emergency');
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
  // Arsenal's current non-destructive part picker shows a proposal first.
  // Confirm the equipped part is unchanged until APPLY PART is committed.
  await page.locator('.arsenal-wb-proposal').waitFor();
  if((await page.locator('.arsenal-wb-current').textContent())?.includes('A2 Fixed'))
   throw Error('Preview-only part selection unexpectedly installed the stock');
  await page.locator('.arsenal-wb-proposal .arsenal-wb-accept').click();
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
  // R13: factory/model changes must be possible without legacy dropdowns.
  await page.getByRole('button',{name:'CHOOSE MODEL'}).click();
  // The compact iPhone UI intentionally hides the desktop platform select:
  // use the visible physical platform chip instead.
  await page.locator('.arsenal-wb-platform-chip[data-platform="mp5"]').click();
  await page.locator('.arsenal-wb-model-controls input').fill('MP5K-PDW');
  await page.locator('.arsenal-wb-load-option').filter({hasText:'MP5K-PDW'}).click();
  const modelReview=await page.locator('.arsenal-wb-load-changes').textContent();
  if(!modelReview?.includes('receiver')||!modelReview.includes('stock'))
   throw Error('Factory change did not disclose receiver and stock: '+modelReview);
  await page.getByRole('button',{name:'USE AS STARTING POINT'}).click();
  await page.waitForFunction(()=>document.querySelector('.arsenal-wb-identity h2')?.
   textContent?.includes('MP5K-PDW'));
  await page.screenshot({path:out+'/arsenal-switch-mp5k-pdw-iphone.png'});
  await page.locator('.arsenal-wb-actions button').filter({hasText:'UNDO'}).click();
  await page.waitForFunction(()=>document.querySelector('.arsenal-wb-current')?.
   textContent?.includes('A2 Fixed'));
  // R14: iPhone primary actions stay within the screen and offer 44px targets.
  const sizes=await page.locator('.arsenal-wb-primary-actions button:visible')
   .evaluateAll(buttons=>buttons.map(b=>{
    const r=b.getBoundingClientRect(),boundary=b.closest('.arsenal-wb-screen').getBoundingClientRect();
    return {label:b.textContent,height:r.height,
      contained:r.left>=boundary.left-1&&r.right<=boundary.right+1};
   }));
  if(sizes.length<3||sizes.some(s=>s.height<43||!s.contained))
   throw Error('Mobile Arsenal actions overflow or miss touch target: '+JSON.stringify(sizes));
  await page.locator('.arsenal-wb-show-all').click();
  const incompatible=page.locator('.arsenal-wb-option[data-fit="incompatible"]').first();
  if(!await incompatible.count())
   throw Error('SHOW UNAVAILABLE did not expose blocked stock choices');
  const beforeCurrent=await page.locator('.arsenal-wb-current').textContent();
  await incompatible.click();
  if(!await page.locator('.arsenal-wb-fit-inline').isVisible())
   throw Error('Unavailable part has no on-device explanation');
  if(await page.locator('.arsenal-wb-current').textContent()!==beforeCurrent)
   throw Error('Inspecting unavailable stock unexpectedly changed the weapon');
  await page.screenshot({path:out+'/arsenal-mobile-compatibility-iphone.png'});
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'BACK TO ARSENAL'}).click();
  if(await page.locator('.arsenal-wb-screen').count()||
    await page.evaluate(()=>document.body.style.overflow==='hidden'))
   throw Error('Workbench close did not restore gallery scrolling');
  // R15: a historical material choice should change its authored swatch
  // without duplicating the wooden stock silhouette in the physical grid.
  // Saving a personal recipe intentionally leaves the gallery on Saved.
  await page.locator('.arsenal-filter').filter({hasText:'All'}).click();
  await page.getByRole('button',{name:'Select AK-74',exact:true}).click();
  await page.getByRole('button',{name:'OPEN WORKBENCH'}).click();
  await page.locator('.arsenal-wb-category').filter({hasText:'Furniture'}).click();
  await page.locator('.arsenal-wb-subslot').filter({hasText:'Stock'}).click();
  const swatches=page.locator('.arsenal-wb-finish-choice');
  if(await swatches.count()<3)throw Error('AK-74 stock does not expose authored finishes');
  if(!await swatches.filter({hasText:'Honey Birch'}).count())
   throw Error('AK-74 original honey birch not recognized');
  const duplicates=await page.locator('.arsenal-wb-option').allTextContents();
  if(duplicates.some(value=>value.includes('Honey Birch')||value.includes('Red Lacquer')))
   throw Error('Material variants were duplicated as separate physical stocks');
  await swatches.filter({hasText:'Red Lacquer'}).click();
  await page.waitForFunction(()=>document.querySelector('.arsenal-wb-current')?.
   textContent?.includes('Red Lacquer'));
  if(!(await page.locator('.arsenal-wb-identity h2').textContent())?.includes('AK-74'))
   throw Error('AK-74 identity lost after material change');
  await page.screenshot({path:out+'/arsenal-ak74-red-lacquer-finish-iphone.png'});
  await page.locator('.arsenal-wb-actions button').filter({hasText:'UNDO'}).click();
  await page.waitForFunction(()=>document.querySelector('.arsenal-wb-current')?.
   textContent?.includes('Honey Birch'));
  if(errors.length)throw Error('Arsenal runtime: '+errors.join('; '));
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
