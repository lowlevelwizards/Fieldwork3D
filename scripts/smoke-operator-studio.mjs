/** A single Chromium mobile smoke: catches a blank WebGL stage, broken item
 * controls or a disconnected local-save path before the release checkpoint. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4196,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('Studio server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:2,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0&&
   !!document.querySelector('[data-appearance-item="combat-shirt"]'),
   null,{timeout:30000});
  const stage=page.locator('.studio-stage'),
   editor=page.locator('.studio-sheet');
  const [box,control]=await Promise.all([stage.boundingBox(),editor.boundingBox()]);
  if(!box||!control||box.height<190||control.height<190)
   throw Error('3D model or editor collapsed on phone');
  const combat=page.locator('[data-appearance-item="combat-shirt"]');
  if(await combat.isDisabled())throw Error('Combat shirt disabled in default kit');
  await combat.click();
  await page.waitForFunction(()=>
   document.querySelector('#studioMaterials .solid-swatches button')!==null,
   null,{timeout:15000});
  await page.locator('#studioMaterials .solid-swatches button').first().click();
  if(!await page.locator('#studioApply').isEnabled())
   throw Error('Solid color change did not mark wardrobe dirty');
  await page.locator('#studioCompare').click();
  if(await page.locator('#studioCompare').getAttribute('aria-pressed')!=='true')
   throw Error('Compare did not show the original saved look');
  await page.locator('#studioCompare').click();
  await page.locator('#studioMore > summary').click();
  page.once('dialog',dialog=>dialog.accept('Mobile QA Uniform'));
  await page.locator('#studioPresetSave').click();
  await page.locator('#studioPresetSelect').selectOption('Mobile QA Uniform');
  if(!await page.locator('#studioPresetApply').isEnabled())
   throw Error('Appearance-only preset not available for application');
  await page.locator('#studioPresetApply').click();
  // The first look stays a draft when switching to another squad member.
  // One Save All transaction must persist both, rather than just the
  // currently selected operator and silently discarding the first.
  await page.locator('#studioOperator').selectOption({index:1});
  await page.locator('[data-appearance-item="combat-shirt"]').click();
  await page.locator('#studioMaterials .solid-swatches button').first().click();
  if((await page.locator('#studioApply').textContent())?.trim()!=='SAVE 2 LOOKS')
   throw Error('Save All did not count multiple operator drafts');
  await page.locator('#studioApply').click();
  await page.waitForFunction(()=>
   document.getElementById('studioStatus')?.textContent?.includes('SAVED 2 LOOKS'),
   null,{timeout:12000});
  if(errors.length)throw Error('Uncaught Studio errors: '+errors.join('; '));
  await mkdir('operator-studio-captures',{recursive:true});
  await page.screenshot({path:'operator-studio-captures/mobile-portrait.png'});
  console.log('Studio mobile WebGL boot, real garment selection, solids and saved appearance passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
