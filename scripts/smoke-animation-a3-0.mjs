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
   await page.locator('#step').click();
   await page.waitForFunction(()=>
    document.querySelector('#clock')?.textContent==='0.017s');
   await page.locator('#scenario').selectOption('mixed-crouch');
   await page.waitForFunction(()=>document.querySelector('#details')?.
    textContent?.includes('"posture": "crouch"'));
   await page.locator('#scenario').selectOption('doorway');
   await page.locator('#operators').selectOption('2');
   await page.locator('#weapon').selectOption('smg');
   await page.locator('#run').click();
   await page.waitForTimeout(200);
   await page.locator('#run').click();
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
  console.log('A3.0 mobile/desktop real-session lab PASS');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
