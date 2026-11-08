/** R7.18 real tactical browser: shared graphic look does not break FOW,
 * scene startup, WebGL shaders, quickplay or the legacy A/B toggle.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4231,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let n=0;n<110;n++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('R7.18 tactical vite server unavailable');
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const captures=[];
  for(const variant of ['graphic','legacy']){
   const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1.5,hasTouch:true,isMobile:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{
    if(m.type()==='error'&&
     /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))
     errors.push(m.text());
   });
   try{
    const url=base+'/breach.html?quick=1&seed=23'+
      (variant==='legacy'?'&lighting=legacy':'');
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.locator('#breach3dCanvas').waitFor({state:'visible',
     timeout:45000});
    await page.waitForFunction(()=>document.querySelector('#phase')?.
     textContent?.includes('PLANNING'),null,{timeout:45000});
    await page.waitForTimeout(900);
    const canvas=page.locator('#breach3dCanvas');
    const screenshot=await canvas.screenshot();
    if(screenshot.byteLength<4000)
     throw Error('Blank '+variant+' tactical WebGL frame');
    if(errors.length)throw Error(variant+' GPU errors: '+errors.join(' | '));
    captures.push(screenshot);
    console.log('R7.18 live tactical '+variant+' WebGL canvas rendered');
   }finally{await page.close();}
  }
  if(captures[0].equals(captures[1]))
   throw Error('Approved 3-band live Breach look appears identical to legacy');
  console.log('R7.18 live tactical graphic/legacy lighting A/B passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
