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
  const groups=armory.locator(':scope > .fw-loadout-group');
  if(await groups.count()!==5)throw Error('Campaign kit must have five clear groups');
  if(await page.locator('.campaign-wardrobe').count())
   throw Error('Legacy duplicate campaign wardrobe remains present');
  if(await page.locator('.campaign-readiness-details').count()!==1)
   throw Error('Readiness technical data is not available on request');
  if(await page.locator('.campaign-kit-presets').count()!==1)
   throw Error('Saved campaign kit presets were lost');
  const workbench=armory.locator('.campaign-kit-workbench-entry');
  if(!await workbench.getByRole('button',{name:/OPEN ARSENAL/i}).isVisible())
   throw Error('Weapon category lost its dedicated Arsenal entry');
  if(!await workbench.getByRole('button',{name:/OPEN ARSENAL/i}).isDisabled())
   throw Error('Curated Dispatch workbench access was unintentionally unlocked');
  const tabs=armory.locator('.campaign-kit-categories [role="tab"]');
  if(await tabs.count()!==5)throw Error('Equipment category navigation incomplete');
  await tabs.filter({hasText:'PROTECTION'}).click();
  const protection=armory.locator('[data-loadout-group="protection"]');
  const armorChoice=protection.getByRole('button',{name:/Choose armor for/i});
  if(!await armorChoice.isVisible())throw Error('Armor equipment chooser is not reachable');
  await armorChoice.click();
  const focus=await page.locator('.campaign-kit-preview').getAttribute('data-preview-focus');
  if(focus!=='torso')throw Error('Armor choice did not focus the operator torso');
  const gearSheet=page.getByRole('dialog',{name:'CHOOSE ARMOR'});
  await gearSheet.waitFor();
  if(!await gearSheet.getByRole('button',{name:/Soft Armor Vest/i}).count())
   throw Error('Current armor missing from equipment chooser');
  await gearSheet.getByRole('button',{name:'CLOSE'}).click();
  await tabs.filter({hasText:'CARRY'}).click();
  const carry=armory.locator('[data-loadout-group="carry"]');
  const rigChoice=carry.getByRole('button',{name:/Choose rig for/i});
  if(!await rigChoice.isVisible())throw Error('Carry equipment chooser is not reachable');
  // E3: The same WebGL canvas must survive actual kit mutation / DOM rebuild.
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
   }
   if(await armory.locator('[data-loadout-group="carry"][open]').count()!==1)
    throw Error('Gear change lost the selected equipment category');
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
