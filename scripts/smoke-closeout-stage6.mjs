/** Stage 6 release browser acceptance.
 * REAL Chromium/WebGL and DOM interactions at iPhone portrait/landscape and
 * desktop sizes. These are EMULATED viewports, not physical iOS Safari.
 * Frozen seed and explicit browser warnings give actionable release evidence.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4276,origin='http://127.0.0.1:'+port;
const root='artifacts/closeout-stage6';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const check=(x,message)=>{if(!x)throw Error(message);};
const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
const metrics=page=>page.evaluate(()=>({
 viewport:{width:innerWidth,height:innerHeight},
 scrollWidth:document.documentElement.scrollWidth,
 phase:document.querySelector('#phase')?.textContent,
 clock:document.querySelector('#clock')?.textContent,
 view:{
  iso:document.querySelector('#viewIso')?.getAttribute('aria-pressed'),
  top:document.querySelector('#viewTop')?.getAttribute('aria-pressed'),
  plan:document.querySelector('#view2d')?.getAttribute('aria-pressed')
 },
 replay:document.querySelector('#replayPanel')?.hidden===false,
 menu:document.querySelector('#siteSettings')?.hidden===false,
 canvas:document.querySelector('#breach3dCanvas')?.style.display
}));
async function capture(page,name){
 await page.screenshot({path:root+'/'+name+'.png'});
}
async function accept(name,context){
 const page=await browser.newPage(context);
 const errors=[],shaderErrors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{
  if(message.type()==='error'&&
   /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(message.text()))
   shaderErrors.push(message.text());
 });
 const before={name};
 try{
  await page.goto(origin+'/?quick=1&seed=23',{
   waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#phase')?.
   textContent==='PLANNING'&&
   !!document.querySelector('#breach3dCanvas'),null,{timeout:60000});
  const initial=await metrics(page);
  check(initial.replay===false,'Replay must start closed: '+name);
  check(initial.view.iso==='true','ISO should be initial camera: '+name);
  check(initial.scrollWidth<=initial.viewport.width+2,
   'Initial horizontal overflow: '+JSON.stringify(initial));
  await capture(page,name+'-initial');
  const setView=async(button,expected)=>{
   await page.locator('#siteSettingsToggle').click();
   await page.locator('#siteSettings:visible').waitFor();
   await page.locator('[data-site-tab="preferences"]').click();
   await page.locator(button).click();
   await page.waitForFunction(
    id=>document.querySelector(id)?.getAttribute('aria-pressed')==='true',
    button,{timeout:15000});
   check(await page.locator('#siteSettings').isHidden(),
    'View change should close mission settings: '+name);
   const state=await metrics(page);
   check(state.view[expected]==='true',
    'Camera state incorrect: '+expected+' '+JSON.stringify(state));
   return state;
  };
  await setView('#viewTop','top');
  await setView('#view2d','plan');
  check((await metrics(page)).canvas==='none',
   'Floor Plan should release WebGL display: '+name);
  await capture(page,name+'-floorplan');
  await setView('#viewIso','iso');
  check((await metrics(page)).canvas!=='none',
   'Returning to ISO should restore WebGL: '+name);
  // GO / PAUSE must keep the real world and command stream alive.
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#phase')?.
   textContent==='RUNNING',null,{timeout:20000});
  // Software WebGL can compile the first few frames slowly in CI.
  // Require real SIMULATION time instead of an arbitrary wall-clock sleep.
  await page.waitForFunction(()=>
   document.querySelector('#clock')?.textContent!=='00:00',
   null,{timeout:30000});
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#phase')?.
   textContent!=='RUNNING',null,{timeout:15000});
  const paused=await metrics(page);
  check(paused.clock!=='00:00','Mission clock did not advance: '+name);
  // Use actual recorded frames; an empty recorder must never fabricate a film.
  let opened=false;
  for(let i=0;i<8&&!opened;i++){
   await page.evaluate(()=>document.querySelector('#watchReplay')?.click());
   opened=await page.locator('#replayPanel').isVisible();
   if(!opened)await settle(450);
  }
  check(opened,'Recorded replay did not open: '+name);
  const replay=await metrics(page);
  check(replay.scrollWidth<=replay.viewport.width+2,
   'Replay horizontal overflow: '+JSON.stringify(replay));
  await capture(page,name+'-replay');
  await page.locator('#replayViewTrigger').click();
  await page.locator('#replayViewChoices [data-view-choice="top"]').click();
  check((await page.locator('#replayQuickView').inputValue())==='top',
   'Replay top view did not commit: '+name);
  await page.locator('#replayViewTrigger').click();
  await page.locator('#replayViewChoices [data-view-choice="iso"]').click();
  check((await page.locator('#replayQuickView').inputValue())==='iso',
   'Replay ISO could not be restored: '+name);
  await page.locator('#replayExit').click();
  check(await page.locator('#replayPanel').isHidden(),
   'Replay exit must restore tactical controls: '+name);
  const resumed=await metrics(page);
  check(resumed.phase===paused.phase,
   'Replay exit changed live mission phase: '+JSON.stringify({paused,resumed}));
  check(resumed.clock===paused.clock,
   'Replay exit changed live world time: '+JSON.stringify({paused,resumed}));
  await capture(page,name+'-resumed');
  // Restart after execution must use the explicit destructive-confirm path.
  await page.locator('#siteSettingsToggle').click();
  await page.locator('#siteSettings:visible').waitFor();
  await page.locator('#restart').click();
  const confirm=page.locator('.fw-confirm-dialog');
  await confirm.waitFor({timeout:10000});
  await confirm.getByRole('button',{name:'RESTART MISSION'}).click();
  await page.waitForFunction(()=>
   document.querySelector('#phase')?.textContent==='PLANNING'&&
   document.querySelector('#clock')?.textContent==='00:00',
   null,{timeout:40000});
  check(await page.locator('#replayPanel').isHidden(),
   'Restart leaked historical replay HUD: '+name);
  // Restart returns to briefing by design; acknowledge the insertion
  // briefing before interacting with the map's mission preferences.
  if(await page.locator('#briefingPanel').isVisible())
   await page.locator('#briefingClose').click();
  // The generator is a non-destructive side trip from the tactical mission.
  await page.locator('#siteSettingsToggle').click();
  await page.locator('#siteSettings:visible').waitFor();
  await page.locator('#quickPlaySetup').click();
  const generator=page.getByRole('dialog',{name:'Quick Play scenario generator'});
  await generator.waitFor({timeout:15000});
  check((await metrics(page)).clock==='00:00',
   'Opening scenario editor changed the mission: '+name);
  await generator.locator('.fw-quick-config-close').click();
  check(await generator.isHidden(),
   'Returning from Quick Play generator left modal on battlefield: '+name);
  const ending=await metrics(page);
  check(ending.scrollWidth<=ending.viewport.width+2,
   'Final horizontal overflow: '+JSON.stringify(ending));
  await capture(page,name+'-restart');
  check(!errors.length,'Runtime errors in '+name+': '+errors.join(' | '));
  check(!shaderErrors.length,'Shader errors in '+name+': '+shaderErrors.join(' | '));
  console.log('Stage 6 WebGL flow PASS '+JSON.stringify({
   name,initial,paused,replay,resumed,ending
  }));
  return {name,initial,paused,replay,resumed,ending};
 }catch(error){
  await capture(page,name+'-FAILED').catch(()=>{});
  console.error('Stage 6 browser failure '+name+' '+
   JSON.stringify({errors,shaderErrors,metrics:await metrics(page).catch(()=>null)}));
  throw error;
 }finally{await page.close();}
}
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}
  await settle(180);
 }
 check(ready,'Stage 6 browser Vite server unavailable');
 await mkdir(root,{recursive:true});
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const results=[];
 results.push(await accept('iphone-portrait',{
  viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true
 }));
 // Landscape includes controls and framing but is not physical iPhone Safari.
 results.push(await accept('desktop',{
  viewport:{width:1440,height:900},deviceScaleFactor:1
 }));
 const landscape=await browser.newPage({
  viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true
 });
 try{
  await landscape.goto(origin+'/?quick=1&seed=23',{
   waitUntil:'domcontentloaded'});
  await landscape.waitForFunction(()=>document.querySelector('#phase')?.
   textContent==='PLANNING',null,{timeout:60000});
  const state=await metrics(landscape);
  check(state.scrollWidth<=state.viewport.width+2,
   'Landscape tactical overflow: '+JSON.stringify(state));
  await capture(landscape,'iphone-landscape');
  console.log('Stage 6 landscape frame PASS '+JSON.stringify(state));
 }finally{await landscape.close();}
 console.log('Stage 6 browser integrated flows PASS: '+
  results.map(r=>r.name).join(', ')+' + phone landscape');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
