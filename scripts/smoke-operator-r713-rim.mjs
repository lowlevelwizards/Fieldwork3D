/** R7.13: small actual WebGL phone smoke for strong near-white rim.
 * Captures on/off at matching front/side/back cameras: catches the previous
 * "uniform changes but no visible highlight" regression.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4217,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,140));
 }
 if(!ready)throw Error('R7.13 Studio vite server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:2,
   hasTouch:true,isMobile:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{
   if(msg.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(msg.text()))
    errors.push(msg.text());
  });
  try{
   await mkdir('operator-studio-captures',{recursive:true});
   const query='?operatorLightingToon=2&operatorCelLow=0.70&'+
    'operatorRim=dual&operatorRimAmount=0.80&'+
    'operatorGradient=piece&operatorShadowColor=plum-plus';
   await page.goto(origin+'/operator-studio.html'+query,{
    waitUntil:'domcontentloaded'
   });
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.ready==='true',
    null,{timeout:40000});
   await page.locator('#studioLightLab > summary').click();
   await page.locator('#studioLightShowWeapon').click();
   await page.waitForFunction(()=>
    Number(document.getElementById('studioCanvas')?.dataset.operatorWeaponMeshes)>0,
    null,{timeout:40000});
   const rim=page.locator('#studioLightRim');
   const opacity=page.locator('#studioRimAmount');
   if(!await opacity.isVisible()||await opacity.inputValue()!=='0.8')
    throw Error('R7.13 default 80% rim opacity not editable');
   const on=[];
   const off=[];
   const shots=['front','side','back'];
   for(const angle of shots){
    await page.locator('[data-studio-view="'+angle+'"]').click();
    await page.waitForTimeout(550);
    await rim.selectOption('dual');
    await page.waitForTimeout(175);
    const onCalls=Number(await page.locator('#studioCanvas').getAttribute('data-draw-calls'));
    const lit=await page.locator('#studioCanvas').screenshot({
     path:'operator-studio-captures/r713-white-rim-on-'+angle+'.png'
    });
    await rim.selectOption('off');
    await page.waitForTimeout(175);
    const offCalls=Number(await page.locator('#studioCanvas').getAttribute('data-draw-calls'));
    const baseline=await page.locator('#studioCanvas').screenshot({
     path:'operator-studio-captures/r713-white-rim-off-'+angle+'.png'
    });
    if(lit.byteLength<3000||baseline.byteLength<3000)
     throw Error('Blank WebGL image at '+angle);
    if(onCalls>offCalls+1)
     throw Error('Rim reintroduced extra geometry draw calls at '+angle);
    on.push(lit);off.push(baseline);
    console.log('R7.13 '+angle+' on/off captured; draw calls '+onCalls+'/'+offCalls+
     ', identical='+lit.equals(baseline));
   }
   if(on.every((buffer,i)=>buffer.equals(off[i])))
    throw Error('No visible pixel change on front, side or back with 80% white rim');
   await rim.selectOption('dual');
   await opacity.focus();await opacity.press('ArrowRight');
   await page.waitForFunction(()=>
    document.getElementById('studioRimAmountValue')?.textContent==='81%',
    null,{timeout:10000});
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.operatorRimMode==='off');
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.operatorRimMode==='dual');
   if(await opacity.inputValue()!=='0.81')
    throw Error('Compare Original lost the white rim opacity slider');
   if(errors.length)throw Error('WebGL shader errors: '+errors.join('; '));
   console.log('R7.13 white lit-surface rim visible, mobile opacity and compare passed');
  }finally{await page.close();}
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
