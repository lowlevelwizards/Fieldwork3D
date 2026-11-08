/** Single iPhone-size release smoke for the redesigned R1 navigation.
 * Uses a deterministic fixed site so map generation isn't the test subject.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4193,origin='http://127.0.0.1:'+port;
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
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:2,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html?fixedSite=1',{waitUntil:'domcontentloaded'});
  await page.locator('#operationsBoardToggle:visible').waitFor({timeout:30000});
  const openMission=async()=>{
   await page.locator('#siteSettingsToggle').click();
   await page.locator('#siteSettings:visible').waitFor();
  };
  await openMission();
  if(!await page.locator('#tacticalSheetShield').isVisible())
   throw Error('Mission menu does not shield map from taps');
  await page.locator('[data-site-tab="environment"]').click();
  if(!await page.locator('#variant').isVisible()||
     await page.locator('#restart').isVisible())
   throw Error('Future-site options not isolated from mission actions');
  await page.locator('[data-site-tab="preferences"]').click();
  await page.locator('#viewTop').click();
  if(await page.locator('#siteSettings').isVisible()||
     await page.locator('#tacticalSheetShield').isVisible())
   throw Error('Camera change did not restore battlefield');
  await openMission();
  if(!await page.locator('#restart').isVisible())
   throw Error('New Mission menu must default to Mission');
  await page.locator('#closeSiteSettings').click();
  await page.locator('#operationsBoardToggle').click();
  await page.locator('#operationsBoard:visible').waitFor();
  if(await page.locator('#operationsBoard details[data-squad-card]').count()!==4)
   throw Error('Squad no longer displays four operators');
  const rook=page.locator('#operationsBoard details[data-squad-card="rook"]');
  await rook.locator(':scope > summary').click();
  if(!await rook.locator('.fw-squad-actions button').filter({hasText:'APPEARANCE'}).isVisible())
   throw Error('Canonical Studio shortcut is missing');
  if(await rook.getByText('WARDROBE / COSMETIC APPEARANCE').count())
   throw Error('Duplicate legacy wardrobe editor is still present');
  await rook.locator('.fw-squad-actions button').filter({hasText:'LOADOUT'}).click();
  if(await rook.locator('.fw-loadout-group').count()!==5)
   throw Error('Purpose-grouped loadout incomplete');
  await rook.getByLabel('PRIMARY WEAPON').selectOption('smg');
  const nextRook=page.locator('#operationsBoard details[data-squad-card="rook"]');
  if(!await nextRook.evaluate(el=>el.open))
   await nextRook.locator(':scope > summary').click();
  const kit=nextRook.locator(':scope > details');
  if(!await kit.evaluate(el=>el.open))
   await nextRook.locator('.fw-squad-actions button').filter({hasText:'LOADOUT'}).click();
  const protection=nextRook.locator('[data-loadout-group="protection"]');
  await protection.locator(':scope > summary').click();
  const armor=protection.getByLabel('armor for');
  await armor.selectOption({index:2});
  await page.locator('#operationsBoard .fw-squad-sheet-header>button').click();
  if(await page.locator('#tacticalSheetShield').isVisible())
   throw Error('Closing Squad left an invisible touch shield');
  await page.locator('#operationsBoardToggle').click();
  const appearance=page.locator('#operationsBoard details[data-squad-card="rook"]');
  if(!await appearance.evaluate(el=>el.open))
   await appearance.locator(':scope > summary').click();
  await appearance.locator('.fw-squad-actions button').filter({hasText:'APPEARANCE'}).click();
  if(!await page.locator('#operatorStudioOverlay').isVisible())
   throw Error('Squad Appearance did not open the authoritative Studio');
  const frame=await page.locator('#operatorStudioOverlay iframe').getAttribute('src');
  if(!frame?.includes('operator=rook')||!frame.includes('embedded=1'))
   throw Error('Operator Studio did not receive selected operator identity');
  if(errors.length)throw Error('Phone runtime errors: '+errors.join('; '));
  console.log('UX R1 mobile Mission, camera, Squad, loadout and Studio handoff passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
