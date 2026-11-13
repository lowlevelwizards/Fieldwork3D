/** A3.0 actual browser smoke; run by dedicated CI workflow. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4237,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
await mkdir('artifacts/animation-a3-0/gallery',{recursive:true});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/a3-physicality-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 if(!ready)throw Error('A3 browser lab unavailable');
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  for(const mode of ['mobile','desktop']){
   const page=await browser.newPage(mode==='mobile'?
    {viewport:{width:390,height:844},deviceScaleFactor:2,
     isMobile:true,hasTouch:true}:
    {viewport:{width:1200,height:820}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/a3-physicality-lab.html',
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lane')?.textContent!=='—',
    null,{timeout:25000});
   if(await page.locator('#lane').textContent()!=='FRIENDLY')
    throw Error(mode+' rear stack did not show baseline friendly block');
   if(await page.locator('#legacyLane').textContent()!=='FRIENDLY')
    throw Error(mode+' original flat-disc comparator missing');
   if(await page.locator('#heightDelta').textContent()!=='SAME')
    throw Error(mode+' centered standing stack unexpectedly disagrees');
   await page.locator('#step').click();
   await page.waitForFunction(()=>
    document.querySelector('#clock')?.textContent==='0.017s');
   await page.locator('#intent').selectOption('engage');
   await page.waitForFunction(()=>document.querySelector('#details')?.
    textContent?.includes('"firePolicy": "engage"'));
   if(await page.locator('#shoulder').textContent()===null||
      await page.locator('#autoStance').textContent()===null)
    throw Error(mode+' A3 tactical micro-aim/stance diagnostics absent');
   await page.locator('#scenario').selectOption('mixed-crouch');
   await page.waitForFunction(()=>document.querySelector('#details')?.
    textContent?.includes('"posture": "crouch"'));
   const crouchReport=await page.locator('#details').textContent();
   if(!crouchReport?.includes('"protectedTop": 26')||
      !crouchReport.includes('"crouched"'))
    throw Error(mode+' does not report actual A3.1 crouched body volumes');
   await page.locator('#scenario').selectOption('doorway');
   await page.locator('#operators').selectOption('2');
   await page.locator('#weapon').selectOption('smg');
   await page.locator('#run').click();
   await page.waitForTimeout(200);
   await page.locator('#run').click();
   // A3.6 and A3.7: real fixed-step anchors must be visible, not invented
   // by the browser or an independent miniature contact simulator.
   await page.locator('#scenario').selectOption('brace-wall');
   await page.locator('#intent').selectOption('hold');
   await page.locator('#operators').selectOption('1');
   await page.locator('#step').click();
   await page.waitForFunction(()=>document.querySelector('#contact')?.
    textContent?.includes('BRACE'),null,{timeout:9000});
   await page.locator('#scenario').selectOption('brace-cover');
   await page.locator('#step').click();
   await page.waitForFunction(()=>document.querySelector('#contact')?.
    textContent?.includes('BRACE'),null,{timeout:9000});
   await page.locator('#scenario').selectOption('brace-frame');
   await page.locator('#step').click();
   await page.waitForFunction(()=>document.querySelector('#contact')?.
    textContent?.includes('BRACE'),null,{timeout:9000});
   await page.locator('#operators').selectOption('4');
   await page.locator('#scenario').selectOption('stack-shoulder');
   await page.locator('#step').click();
   await page.waitForFunction(()=>document.querySelector('#contact')?.
    textContent?.includes('TEAMMATE'),null,{timeout:9000});
   const contacts=await page.locator('#details').textContent();
   if(!contacts?.includes('contactAnchors')||
     !contacts.includes('targetId'))
    throw Error(mode+' A3.7 lacks real team contact provenance');
   await page.screenshot({path:'artifacts/animation-a3-0/gallery/'+mode+'.png',
    fullPage:true});
   const perf=await page.locator('#perf').textContent();
   if(!perf?.includes('meanProbeMs'))throw Error(mode+' missing CPU diagnostics');
   const detail=await page.locator('#details').textContent();
   if(!detail?.includes('actualShot')||!detail.includes('visualMuzzle'))
    throw Error(mode+' does not expose both physical authorities');
   if(errors.length)throw Error(mode+' browser errors: '+errors.join('; '));
   await page.close();
  }
  console.log('A3.1 actual mobile/desktop body-volume gallery PASS');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
