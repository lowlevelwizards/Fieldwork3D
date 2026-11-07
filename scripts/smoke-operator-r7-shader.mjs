/** R7 opt-in real WebGL shader smoke, not a synthetic shader-string proof.
 * One 390px mobile browser, two cel/rim presets, no background campaign tests.
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
 if(!ready)throw Error('R7 shader smoke preview server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  await mkdir('operator-studio-captures',{recursive:true});
  for(const [name,query,band,rim] of [
   ['pixel-rim','?operatorLightingToon=3&operatorRim=pixel',3,'pixel'],
   ['hard-rim','?operatorLightingToon=2&operatorRim=hard',2,'hard']
  ]){
   const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1.5,
    isMobile:true,hasTouch:true
   });
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{
    if(m.type()==='error'&&
       /WebGLProgram|shader error|INVALID_OPERATION|compile|linker/i.test(m.text()))
     errors.push(m.text());
   });
   try{
    await page.goto(origin+'/operator-studio.html'+query,
     {waitUntil:'domcontentloaded'});
    await page.waitForFunction(([bands,mode])=>{
     const canvas=document.getElementById('studioCanvas');
     return canvas?.dataset.ready==='true'&&
      Number(canvas.dataset.drawCalls)>0&&
      Number(canvas.dataset.operatorToonMeshes)>0&&
      Number(canvas.dataset.operatorToonBands)===bands&&
      canvas.dataset.operatorRimMode===mode;
    },[band,rim],{timeout:35000});
    const capture=await page.locator('#studioCanvas').screenshot({
     path:'operator-studio-captures/r7-'+name+'-phone.png'
    });
    if(capture.byteLength<3000)throw Error('Blank '+name+' visual capture');
    if(errors.length)throw Error(name+' WebGL errors: '+errors.join('; '));
    console.log('R7 '+name+' rendering passed');
   }finally{await page.close();}
  }
  // R7.8: exercise the actual controls, no URL reloads or mock images.
  const live=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1.5,
   isMobile:true,hasTouch:true
  });
  const uiErrors=[];
  live.on('pageerror',error=>uiErrors.push(error.message));
  live.on('console',message=>{
   if(message.type()==='error'&&
      /WebGLProgram|shader error|INVALID_OPERATION|compile|linker/i.test(message.text()))
    uiErrors.push(message.text());
  });
  try{
   await live.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
   await live.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.ready==='true',
    null,{timeout:35000});
   await live.locator('#studioLightLab > summary').click();
   await live.locator('#studioLightCel').selectOption('3');
   await live.locator('#studioLightRim').selectOption('pixel');
   await live.locator('#studioLightGradient').selectOption('sculptural');
   await live.locator('#studioLightShadow').selectOption('steel');
   await live.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='3'&&s.operatorRimMode==='pixel'&&
     s.operatorGradient==='sculptural'&&s.operatorShadowColor==='steel';
   },null,{timeout:35000});
   const edited=await live.locator('#studioCanvas').screenshot({
    path:'operator-studio-captures/r7-live-lighting-lab-phone.png'
   });
   if(edited.byteLength<3000)throw Error('Blank live light lab image');
   await live.locator('#studioLightCompare').click();
   await live.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='0'&&s.operatorGradient==='current'&&
     s.operatorRimMode==='off'&&s.operatorShadowColor==='neutral';
   },null,{timeout:35000});
   if(await live.locator('#studioLightCel').inputValue()!=='3')
    throw Error('Compare Original erased the selected cel style');
   await live.locator('#studioLightCompare').click();
   await live.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='3'&&s.operatorRimMode==='pixel'&&
     s.operatorGradient==='sculptural'&&s.operatorShadowColor==='steel';
   },null,{timeout:35000});
   await live.locator('#studioLightReset').click();
   await live.waitForFunction(()=>{
    const s=document.getElementById('studioCanvas')?.dataset;
    return s?.operatorToonBands==='0'&&s.operatorRimMode==='off'&&
     s.operatorGradient==='current'&&s.operatorShadowColor==='neutral';
   },null,{timeout:35000});
   if(await live.locator('#studioLightRim').isEnabled())
    throw Error('Rim style editable without cel shading');
   if(uiErrors.length)throw Error('Live Lighting Lab WebGL errors: '+
    uiErrors.join('; '));
   console.log('R7 live Lighting Lab comparison, reset and WebGL smoke passed');
  }finally{await live.close();}
 }finally{await browser.close();}
}finally{
 server.kill('SIGTERM');
}
