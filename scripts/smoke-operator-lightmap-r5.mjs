/** R5.2-D single phone-sized WebGL validation of the EXPERIMENTAL
 * UV1 self-shadow atlas. No production-mode changes or extra CI workflow.
 * The regular Studio smoke still exercises default lighting first.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4207,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<95;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('R5 atlas Studio test server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1.5,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
   if(message.type()==='error'&&
      /WebGLProgram|shader error|INVALID_OPERATION/i.test(message.text()))
    errors.push('WebGL: '+message.text());
  });
  await page.goto(origin+
   '/operator-studio.html?operatorLightingAtlas=1&operatorLightingDebug=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0,
   null,{timeout:30000});
  await page.getByRole('button',{name:'REFERENCES',exact:true}).click();
  await page.locator('.reference-search').fill('OCP Infantry');
  await page.locator('.reference-card').first().click();
  await page.waitForFunction(()=>{
   const el=document.getElementById('studioCanvas');
   return Number(el?.dataset.operatorAtlasCount)>0&&
    Number(el?.dataset.operatorAtlasBytes)>0;
  },null,{timeout:25000});
  const state=await page.evaluate(()=>{
   const c=document.getElementById('studioCanvas');
   return {
    drawing:c?.dataset.ready,
    drawCalls:Number(c?.dataset.drawCalls),
    atlases:Number(c?.dataset.operatorAtlasCount),
    bytes:Number(c?.dataset.operatorAtlasBytes),
    inspector:!!document.querySelector('.studio-stage pre')
   };
  });
  if(!state.inspector)throw Error('Studio debug inspector missing');
  if(state.atlases<1||state.bytes<1)
   throw Error('R5 self-shadow atlas not materialized');
  if(state.bytes>8*1024*1024)
   throw Error('R5 atlas exceeded 8 MiB memory budget');
  await mkdir('operator-studio-captures',{recursive:true});
  const path='operator-studio-captures/r5-uv1-atlas-phone.png';
  const png=await page.locator('#studioCanvas').screenshot({path});
  if(png.byteLength<3000)throw Error('Blank atlas WebGL screenshot');
  if(errors.length)throw Error('R5 atlas WebGL errors: '+errors.join('; '));
  console.log('R5 UV1 atlas phone proof passed: '+JSON.stringify(state));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
