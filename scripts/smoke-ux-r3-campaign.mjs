/** UX R3 iPhone smoke: Campaign preparation owns functional kit;
 * canonical Studio owns looks. No arbitrary map generation or gameplay timing.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4194,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('Fieldwork preview server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('.campaign-landing-primary').waitFor({timeout:30000});
  await page.locator('.campaign-landing-primary').click();
  await page.getByRole('button',{name:/^DISPATCH —/}).click();
  await page.getByRole('button',{name:'CREATE DISPATCH',exact:true}).click();
  await page.locator('#campaign-tab-personnel').waitFor({timeout:30000});
  await page.locator('#campaign-tab-personnel').click();
  const person=page.locator('.campaign-person').first();
  await person.locator('.campaign-person-expand > summary').click();
  await person.getByRole('button',{name:/^Open .* loadout$/}).click();
  const armory=page.locator('.campaign-kit-editor');
  await armory.waitFor({timeout:15000});
  const operatorPreview=page.locator('.campaign-kit-preview');
  if(await operatorPreview.locator('canvas').count()){
   // The default active WEAPON category is framed on the first WebGL paint.
   if(await operatorPreview.getAttribute('data-preview-focus')!=='weapon')
    throw Error('Fresh campaign armory preview ignored the active Weapon category');
   if(!await operatorPreview.getAttribute('aria-label')?.then(label=>label?.includes('Weapon view.')))
    throw Error('Initial preview accessibility label omitted the Weapon focus');
   await operatorPreview.focus();
   const before=await operatorPreview.getAttribute('aria-label');
   await operatorPreview.press('ArrowRight');
   const after=await operatorPreview.getAttribute('aria-label');
   if(!before?.includes('Left and Right arrow keys')||after===before)
    throw Error('Operator 3D preview is not keyboard rotatable');
   if(await operatorPreview.getAttribute('aria-keyshortcuts')!==
    'ArrowLeft ArrowRight Home')
    throw Error('Preview did not disclose the Home keyboard reset shortcut');
   await operatorPreview.press('Home');
   if(await operatorPreview.getAttribute('aria-label')!==before)
    throw Error('Home key did not reset the preview to its initial orientation');
   if(await operatorPreview.getAttribute('data-preview-focus')!=='weapon')
    throw Error('Home key unexpectedly changed the equipment preview focus');
   const gesture=await operatorPreview.evaluate(element=>{
    const first=element.getAttribute('aria-label');
    const dispatch=(kind,x,id=41,isPrimary=true)=>
     element.dispatchEvent(new PointerEvent(kind,{
      bubbles:true,pointerId:id,pointerType:'touch',isPrimary,button:0,
      clientX:x,clientY:170
     }));
    // Secondary fingers must never steal a later primary interaction.
    dispatch('pointerdown',120,40,false);
    dispatch('pointermove',200,40,false);
    dispatch('pointerup',200,40,false);
    const ignoredSecondary=element.getAttribute('aria-label')===first;
    dispatch('pointerdown',120);
    dispatch('pointermove',200);
    dispatch('pointerup',200);
    const last=element.getAttribute('aria-label');
    // A browser can lose capture without delivering pointerup; the next
    // gesture must still rotate and commit its accessible orientation.
    dispatch('pointerdown',210,42);
    dispatch('pointermove',245,42);
    dispatch('lostpointercapture',245,42);
    const afterLoss=element.getAttribute('aria-label');
    dispatch('pointerdown',245,43);
    dispatch('pointermove',280,43);
    dispatch('pointerup',280,43);
    return {first,last,ignoredSecondary,afterLoss,
     afterRecovery:element.getAttribute('aria-label')};
   });
   if(!gesture.ignoredSecondary)
    throw Error('Secondary touch moved the preview or captured its gesture');
   if(gesture.last===gesture.first)
    throw Error('Completed preview drag failed to update accessible view angle');
   if(gesture.afterLoss===gesture.last||gesture.afterRecovery===gesture.afterLoss)
    throw Error('Lost pointer capture left the preview stuck or orientation stale');
   const orbit=page.getByRole('group',{name:'Operator preview rotation'});
   const left=orbit.getByRole('button',{name:'Rotate operator 45 degrees left'});
   const right=orbit.getByRole('button',{name:'Rotate operator 45 degrees right'});
   const reset=orbit.getByRole('button',{name:'Reset operator preview angle'});
   const flip=orbit.getByRole('button',
    {name:'Turn operator 180 degrees to inspect the rear'});
   if(await orbit.locator('button').count()!==4)
    throw Error('Phone preview rotation and rear-inspection controls are not available');
   const touchTargets=await orbit.locator('button').evaluateAll(buttons=>
    buttons.map(button=>button.getBoundingClientRect().height));
   if(touchTargets.some(height=>height<43))
    throw Error('Preview rotation control touch targets are too small');
   const angleBeforeButtons=await operatorPreview.getAttribute('aria-label');
   await left.click();
   const rotatedLeft=await operatorPreview.getAttribute('aria-label');
   if(rotatedLeft===angleBeforeButtons)
    throw Error('Preview left rotation control did not move the camera');
   await right.click();
   if(await operatorPreview.getAttribute('aria-label')!==angleBeforeButtons)
    throw Error('Left and right preview rotation did not round-trip');
   await reset.click();
   if(await operatorPreview.getAttribute('aria-label')!==before)
    throw Error('Reset angle did not restore the initial operator orientation');
   if(await operatorPreview.getAttribute('data-preview-focus')!=='weapon')
    throw Error('Reset angle unexpectedly discarded current equipment focus');
   await flip.click();
   const rearAngle=await operatorPreview.getAttribute('aria-label');
   if(rearAngle===before||await operatorPreview.getAttribute('data-preview-focus')!=='weapon')
    throw Error('Rear-view half turn did not move camera without losing focus');
   await flip.click();
   if(await operatorPreview.getAttribute('aria-label')!==before)
    throw Error('Rear-view half turn did not restore the original orientation');
   await reset.click();
   // Switching operators replaces the WebGL context but must preserve an
   // independent preview angle for each operator, not share one global orbit.
   const operatorTabs=page.locator('.campaign-kit-nav button');
   if(await operatorTabs.count()<2)
    throw Error('Dispatch campaign must have two operators for orbit continuity smoke');
   await right.click();
   const firstAngle=await operatorPreview.getAttribute('aria-label');
   await operatorTabs.nth(1).click();
   const secondAngle=await operatorPreview.getAttribute('aria-label');
   const degrees=label=>Number(label?.match(/View angle (\d+) degrees/)?.[1]);
   if(!Number.isFinite(degrees(secondAngle))||
      degrees(secondAngle)!==degrees(before))
    throw Error('Second operator inherited first operator camera rotation');
   await page.getByRole('button',{name:'Rotate operator 45 degrees left'}).click();
   const secondRotated=await operatorPreview.getAttribute('aria-label');
   if(degrees(secondRotated)===degrees(secondAngle))
    throw Error('Second operator rotation controls did not affect its own view');
   await operatorTabs.first().click();
   if(await operatorPreview.getAttribute('aria-label')!==firstAngle)
    throw Error('Returning to first operator lost its saved preview angle');
   await operatorTabs.nth(1).click();
   if(await operatorPreview.getAttribute('aria-label')!==secondRotated)
    throw Error('Second operator view angle leaked or reset during switching');
   await operatorTabs.first().click();
   await page.getByRole('button',{name:'Reset operator preview angle'}).click();
   if(await operatorPreview.getAttribute('aria-label')!==before)
    throw Error('Operator-specific reset did not restore default angle');
  }
  const groups=armory.locator(':scope > .fw-loadout-group');
  if(await groups.count()!==5)throw Error('Campaign kit must have five clear groups');
  if(await page.locator('.campaign-wardrobe').count())
   throw Error('Legacy duplicate campaign wardrobe remains present');
  if(await page.locator('.campaign-readiness-details').count()!==1)
   throw Error('Readiness technical data is not available on request');
  if(await page.getByRole('progressbar',{name:'BODY ARMOR condition'}).count()!==1)
   throw Error('Armor condition and protection rating are not distinguishable');
  if(await page.locator('.campaign-kit-presets').count()!==1)
   throw Error('Saved campaign kit presets were lost');
  await page.locator('.campaign-kit-presets > summary').click();
  if(!await page.getByRole('button',{name:'SAVE CURRENT KIT'}).isVisible())
   throw Error('Equipment preset save action is not reachable');
  if(!await page.locator('.campaign-kit-preset-list').isVisible())
   throw Error('Equipment preset list was not exposed');
  await page.getByRole('button',{name:'SAVE CURRENT KIT'}).click();
  const savePrompt=page.locator('.fw-confirm-dialog');
  await savePrompt.locator('.fw-text-prompt').fill('Mobile Test Kit');
  await savePrompt.getByRole('button',{name:'SAVE PRESET'}).click();
  await page.locator('.campaign-kit-preset-card').waitFor({timeout:15000});
  if(!await page.locator('.campaign-kit-presets').evaluate(el=>el.open))
   throw Error('Saved preset disclosure closed after campaign update');
  if(!await page.locator('.campaign-kit-preset-card').getByRole('button',
   {name:'EQUIP KIT'}).isEnabled())
   throw Error('New Dispatch equipment preset unexpectedly unavailable');
  await page.locator('.campaign-kit-presets > summary').click();
  const workbench=armory.locator('.campaign-kit-workbench-entry');
  if(!await workbench.getByRole('button',{name:/OPEN ARSENAL/i}).isVisible())
   throw Error('Weapon category lost its dedicated Arsenal entry');
  if(!await workbench.getByRole('button',{name:/OPEN ARSENAL/i}).isDisabled())
   throw Error('Curated Dispatch workbench access was unintentionally unlocked');
  const tabs=armory.locator('.campaign-kit-categories [role="tab"]');
  if(await tabs.count()!==5)throw Error('Equipment category navigation incomplete');
  await tabs.filter({hasText:'ISSUED BASICS'}).click();
  await page.waitForFunction(()=>{
   const rail=document.querySelector('.campaign-kit-categories');
   const selected=rail?.querySelector('[aria-selected="true"]');
   if(!rail||!selected)return false;
   const bounds=rail.getBoundingClientRect(),tab=selected.getBoundingClientRect();
   return tab.left>=bounds.left-2&&tab.right<=bounds.right+2;
  },null,{timeout:4000});
  if(!await armory.locator('[data-loadout-group="issued"][open]').count())
   throw Error('Issued gear panel did not activate from the category rail');
  await tabs.filter({hasText:'PROTECTION'}).click();
  const protection=armory.locator('[data-loadout-group="protection"]');
  const armorChoice=protection.getByRole('button',{name:/Choose armor for/i});
  if(!await armorChoice.isVisible())throw Error('Armor equipment chooser is not reachable');
  await armorChoice.click();
  const lockedScroll=await page.evaluate(()=>
   document.querySelector('.campaign-screen')?.style.overflow==='hidden');
  if(!lockedScroll)throw Error('Gear choice sheet allowed background page scrolling');
  const hasMassComparison=await page.locator('.campaign-gear-picker-option small')
   .evaluateAll(items=>items.some(item=>item.textContent?.includes('ITEM MASS')));
  if(!hasMassComparison)throw Error('Equipment choice hides item weight tradeoffs');
  const focus=await page.locator('.campaign-kit-preview').getAttribute('data-preview-focus');
  if(focus!=='torso')throw Error('Armor choice did not focus the operator torso');
  if(!await operatorPreview.getAttribute('aria-label')?.then(label=>label?.includes('Torso view.')))
   throw Error('Changing preview focus did not announce the selected torso region');
  const gearSheet=page.getByRole('dialog',{name:'CHOOSE ARMOR'});
  await gearSheet.waitFor();
  if(!await gearSheet.getByRole('button',{name:/Soft Armor Vest/i}).count())
   throw Error('Current armor missing from equipment chooser');
  await gearSheet.getByRole('button',{name:'CLOSE'}).click();
  if(await page.evaluate(()=>
   document.querySelector('.campaign-screen')?.style.overflow==='hidden'))
   throw Error('Equipment chooser failed to restore scrolling');
  await tabs.filter({hasText:'CARRY'}).click();
  const carry=armory.locator('[data-loadout-group="carry"]');
  const rigChoice=carry.getByRole('button',{name:/Choose rig for/i});
  if(!await rigChoice.isVisible())throw Error('Carry equipment chooser is not reachable');
  const originalRig=await rigChoice.textContent();
  // Rotation buttons must remain wired after the real Campaign DOM rebuild.
  if(await operatorPreview.locator('canvas').count()){
   const existing=await operatorPreview.getAttribute('aria-label');
   await page.getByRole('button',{name:'Rotate operator 45 degrees right'}).click();
   if(await operatorPreview.getAttribute('aria-label')===existing)
    throw Error('Carry preview rotation button stopped responding');
  }
  const orientationBeforeKitMutation=await operatorPreview.getAttribute('aria-label');
  // E3: The same WebGL canvas and user-selected view must survive mutation.
  const canvasBefore=await page.evaluate(()=>{
   const canvas=document.querySelector('.campaign-kit-preview canvas');
   if(canvas)window.__fieldworkKitCanvas=canvas;
   return !!canvas;
  });
  await rigChoice.click();
  const rigSheet=page.getByRole('dialog',{name:'CHOOSE RIG'});
  await rigSheet.waitFor();
  const currentRig=await rigSheet.locator('[aria-current="true"]').textContent();
  const swap=rigSheet.getByRole('button',{name:/No Chest Rig/i});
  if(!currentRig?.includes('No Chest Rig')&&!await swap.isDisabled()){
   await swap.click();
   await page.getByRole('button',{name:/Choose rig for/i}).waitFor();
   const changed=await page.getByRole('button',{name:/Choose rig for/i}).textContent();
   if(!changed?.includes('No Chest Rig'))
    throw Error('Campaign gear change failed to update the active loadout');
   if(canvasBefore){
    const stillSame=await page.evaluate(()=>
     document.querySelector('.campaign-kit-preview canvas')===
      window.__fieldworkKitCanvas);
    if(!stillSame)throw Error('Operator preview WebGL canvas recreated after gear change');
    if(await operatorPreview.getAttribute('aria-label')!==orientationBeforeKitMutation)
     throw Error('Equipment mutation reset the user-selected preview orientation');
   }
   if(await operatorPreview.getAttribute('data-preview-focus')!=='carry')
    throw Error('Gear rebuild lost the selected category camera framing');
   if(!await operatorPreview.getAttribute('aria-label')?.then(label=>label?.includes('Carried equipment view.')))
    throw Error('Gear rebuild failed to preserve the accessible Carry focus');
   if(await armory.locator('[data-loadout-group="carry"][open]').count()!==1)
    throw Error('Gear change lost the selected equipment category');
   // Confirm mutation restores picker focus *before* testing new buttons,
   // whose legitimate pointer clicks intentionally take keyboard focus.
   if(!await page.evaluate(()=>
    document.activeElement?.getAttribute('aria-label')?.includes('Choose rig')))
    throw Error('Equipment swap failed to return focus to its replacement slot');
   if(canvasBefore){
    await page.getByRole('button',{name:'Rotate operator 45 degrees left'}).click();
    if(await operatorPreview.getAttribute('aria-label')===orientationBeforeKitMutation)
     throw Error('Rebuilt kit rotation controls point to an obsolete preview');
    await page.getByRole('button',{name:'Rotate operator 45 degrees right'}).click();
    if(await operatorPreview.getAttribute('aria-label')!==orientationBeforeKitMutation)
     throw Error('Rebuilt kit controls failed to restore the operator angle');
   }
   if(!await page.locator('.campaign-kit-commit-feedback').isVisible())
    throw Error('Committed gear change has no visible confirmation');
   if(!await page.locator('[data-loadout-group="carry"] .campaign-kit-choice[data-changed="true"]').count())
    throw Error('Committed equipment slot was not highlighted');
   await page.locator('.campaign-kit-presets > summary').click();
   await page.locator('.campaign-kit-preset-card').getByRole('button',
    {name:'EQUIP KIT'}).click();
   await page.waitForFunction(expected=>
    [...document.querySelectorAll('.campaign-kit-picker-trigger')].some(el=>
      el.getAttribute('aria-label')?.includes('rig')&&el.textContent===expected),
    originalRig,{timeout:15000});
   if(!await page.locator('.campaign-kit-presets').evaluate(el=>el.open))
    throw Error('Preset panel closed after applying saved gear');
   if(canvasBefore){
    const preserved=await page.evaluate(()=>({
     canvas:document.querySelector('.campaign-kit-preview canvas')===window.__fieldworkKitCanvas,
     orientation:document.querySelector('.campaign-kit-preview')?.getAttribute('aria-label')
    }));
    if(!preserved.canvas||preserved.orientation!==orientationBeforeKitMutation)
     throw Error('Saved kit restore recreated or reset the operator preview');
   }
   await page.locator('.campaign-kit-preset-card').getByRole('button',
    {name:'DELETE'}).click();
   await page.getByRole('alertdialog').getByRole('button',
    {name:'DELETE PRESET'}).click();
   await page.waitForFunction(()=>
    document.querySelectorAll('.campaign-kit-preset-card').length===0,
    null,{timeout:15000});
   await page.locator('.campaign-kit-presets > summary').click();
  }else{
   await rigSheet.getByRole('button',{name:'CLOSE'}).click();
   throw Error('Expected selectable alternate rig to exercise saved kit mutation');
  }
  await page.getByRole('button',{name:'APPEARANCE · OPEN STUDIO'}).click();
  await page.locator('#operatorStudioOverlay:visible').waitFor({timeout:15000});
  const frame=await page.locator('#operatorStudioOverlay iframe').getAttribute('src');
  if(!frame?.includes('mode=campaign')||!frame.includes('embedded=1'))
   throw Error('Campaign did not open canonical Studio');
  if(errors.length)throw Error('Campaign UI runtime errors: '+errors.join('; '));
  console.log('UX R3 Campaign phone smoke passed: roster → kit → Studio');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
