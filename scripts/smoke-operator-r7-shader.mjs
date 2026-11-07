/** R7.10 critical real WebGL/mobile input smoke.
 * Pixel/hard legacy URLs normalize to the new safe graphic modes.
 * Test native range focus/keyboard changes, not merely synthetic events.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4213,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let attempt=0;attempt<90;attempt++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!ready)throw Error('Preview server unavailable for R7.10 smoke');
 const browser=await chromium.launch({headless:true});
 try{
  await mkdir('operator-studio-captures',{recursive:true});
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1.5,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
   if(message.type()==='error'&&
      /WebGLProgram|shader error|INVALID_OPERATION|compile|linker/i.test(message.text()))
    errors.push(message.text());
  });
  try{
   await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.ready==='true',
    null,{timeout:35000});
   await page.locator('#studioLightLab > summary').click();
   if(await page.locator('#studioCelLow').isVisible())
    throw Error('Cel cutoff shown while Smooth is selected');
   if(await page.locator('#studioRimAmount').isVisible())
    throw Error('Rim intensity shown while rim is Off');
   await page.locator('#studioLightCel').selectOption('2');
   await page.locator('#studioLightRim').selectOption('dual');
   await page.locator('#studioLightGradient').selectOption('piece');
   await page.locator('#studioLightShadow').selectOption('plum-plus');
   await page.locator('#studioLightShowWeapon').click();
   const cel=page.locator('#studioCelLow');
   const rim=page.locator('#studioRimAmount');
   if(!await cel.isVisible()||!await rim.isVisible())
    throw Error('Active range controls are hidden or disabled');
   // Actual keyboard-input interaction exercises the native range widget;
   // merely dispatching a change event would miss the reported UX bug.
   await cel.focus();await cel.press('ArrowRight');
   await rim.focus();await rim.press('ArrowRight');
   await page.waitForFunction(()=>{
    const canvas=document.getElementById('studioCanvas');
    const s=canvas?.dataset;
    return s?.operatorToonBands==='2'&&s.operatorRimMode==='dual'&&
     s.operatorGradient==='piece'&&s.operatorShadowColor==='plum-plus'&&
     Number(s.operatorWeaponMeshes)>0&&
     document.getElementById('studioCelLowValue')?.textContent==='71%'&&
     document.getElementById('studioRimAmountValue')?.textContent==='25%';
   },null,{timeout:35000});
   const img=await page.locator('#studioCanvas').screenshot({
    path:'operator-studio-captures/r710-graphic-two-band-pieces-weapon-phone.png'
   });
   if(img.byteLength<3000)throw Error('Blank R7.10 WebGL frame');
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='0'&&s.operatorRimMode==='off'&&
     s.operatorGradient==='current'&&s.operatorShadowColor==='neutral';
   },null,{timeout:35000});
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='2'&&s.operatorRimMode==='dual'&&
     s.operatorGradient==='piece'&&s.operatorShadowColor==='plum-plus';
   },null,{timeout:35000});
   if(await cel.inputValue()!=='0.71'||await rim.inputValue()!=='0.25')
    throw Error('Compare Original lost tuned slider amounts');
   await page.locator('#studioLightReset').click();
   await page.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='0'&&s.operatorRimMode==='off'&&
     s.operatorGradient==='current'&&s.operatorShadowColor==='neutral';
   },null,{timeout:35000});
   if(await cel.isVisible()||await rim.isVisible())
    throw Error('Reset must hide inactive cutoff/rim controls');
   if(errors.length)throw Error('R7.10 WebGL errors: '+errors.join('; '));
   console.log('R7.10 live cel/rim native sliders, per-piece gradient, weapon and Compare Original passed');
  }finally{await page.close();}
 }finally{await browser.close();}
}finally{
 server.kill('SIGTERM');
}
