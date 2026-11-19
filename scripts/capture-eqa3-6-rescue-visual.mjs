/** EQA3.6 actual shipped-UI browser capture, NOT the omniscient SVG.
 * Programmatically enter the PUBLIC Quick Play scenario creator and launch
 * the exact seed/mission; never mutate game Session or bypass fog.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import('playwright');
const folder=resolve('artifacts/eqa3-6-browser');
await mkdir(folder,{recursive:true});
const port=4193,base=`http://127.0.0.1:${port}/`;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base)).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 if(!ready)throw Error('Live UI Vite preview unavailable');
 browser=await chromium.launch({headless:true,args:[
   '--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader'
 ]});
 const manifest=[];
 for(const [seed,building] of [[13,'apartment'],[17,'warehouse']]){
  const context=await browser.newContext({
   viewport:{width:390,height:844},deviceScaleFactor:1,
   hasTouch:true,isMobile:true,
   reducedMotion:'reduce'
  });
  const page=await context.newPage();
  page.setDefaultTimeout(40000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Existing creator persistence is a user-facing preference, not
  // hidden Session mutation. The subsequent actual Generate button must
  // accept the settings and construct real world/mission state.
  await page.addInitScript(config=>{
   localStorage.setItem('fieldwork.quickplay.generator.v1',
     JSON.stringify(config));
  },{
   seed,size:'small',buildings:[building],mission:'rescue',
   incident:'random',presence:'random',civilians:'scenario',
   objectiveIntel:'unknown'
  });
  await page.goto(base+`?quick=1&seed=${seed}&scale=small&gpuWarmup=0&briefingIdle=0`,{
   waitUntil:'domcontentloaded',timeout:60000
  });
  await page.locator('#siteIdentity').waitFor({state:'attached'});
  let setup=page.locator('.fw-quick-config-backdrop:not([hidden])');
  if(!(await setup.count())){
   if(await page.locator('#briefingQuickPlaySetup').isVisible()){
    await page.locator('#briefingQuickPlaySetup').click();
   }else{
    await page.locator('#siteSettingsToggle').click();
    await page.locator('#quickPlaySetup').click();
   }
  }
  await page.locator('.fw-quick-config-backdrop:not([hidden])').waitFor();
  const settings=await page.locator('.fw-quick-config-summary').innerText();
  if(!settings.includes('rescue')||!settings.includes('Seed '+seed))
    throw Error('Quick Play config did not preserve exact rescue seed: '+settings);
  await page.locator('.fw-quick-config-start').click();
  // The actual worker compiles a fresh site and the existing renderer
  // constructs the first real mission camera and fog.
  await page.waitForFunction(expected=>{
   const identity=document.querySelector('#siteIdentity');
   const briefing=document.querySelector('#briefingType');
   return identity?.getAttribute('data-site-seed')===String(expected)&&
    /RESCUE/i.test(briefing?.textContent??'')&&
    document.querySelector('#quickPlayProgress')?.hidden===true;
  },seed,{timeout:150000});
  const briefLabel=await page.locator('#briefingType').innerText();
  const siteLabel=await page.locator('#siteIdentity').getAttribute('data-site-seed');
  const archetype=await page.locator('#briefingLocation').innerText();
  await page.screenshot({path:resolve(folder,`${seed}-rescue-briefing-phone.png`)});
  const close=page.locator('#briefingClose');
  if(await close.isVisible())await close.click();
  await page.locator('#breach3dCanvas').waitFor({state:'visible'});
  await page.waitForTimeout(250);
  await page.screenshot({path:resolve(folder,`${seed}-rescue-iso-phone.png`)});
  // Use the same human-accessible Settings > Preferences > 2D view as
  // ordinary play. No omniscient game state or manual fog override.
  await page.locator('#siteSettingsToggle').click();
  await page.locator('[data-site-tab="preferences"]').click();
  await page.locator('#view2d').click();
  await page.waitForTimeout(200);
  await page.screenshot({path:resolve(folder,`${seed}-rescue-2d-phone.png`)});
  if(errors.length)throw Error('Real browser errors: '+errors.join('; '));
  const record={seed,selectedMission:'rescue',size:'small',building,
    seedReadback:siteLabel,briefLabel,siteLabel:archetype,settings,
    screenshots:[`${seed}-rescue-briefing-phone.png`,
      `${seed}-rescue-iso-phone.png`,
      `${seed}-rescue-2d-phone.png`],
    warnings:errors};
  manifest.push(record);
  console.log(JSON.stringify(record));
  await context.close();
 }
 await writeFile(resolve(folder,'manifest.json'),
  JSON.stringify({schema:'EQA3.6/live-browser-views-v1',
    disclaimer:'Actual UI/screens, not world-truth diagrams; retain real fog',
    captures:manifest},null,2));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
