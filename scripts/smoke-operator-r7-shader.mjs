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
 }finally{await browser.close();}
}finally{
 server.kill('SIGTERM');
}
