/** E6.9: CDP CPU sampling around precisely the FIRST Quick Play draw.
 * Console-profile begin/end are gated by ?cpuTrace=1 in production code.
 * Chromium/ANGLE SwiftShader is not physical mobile GPU benchmark evidence.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {summarizeColdCpuProfile} from './e6-9-cold-cpu-analysis.mjs';

const port=4399,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-9/cold-cpu';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<150;i++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}
  catch{}
  await wait(150);
 }
 if(!ready)throw Error('E6.9 Vite server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const result={
  schema:'fieldwork-e6.9-cold-first-frame-cdp-ab-v1',
  method:'Chromium CDP Profiler.consoleProfileFinished, started/ended directly in synchronous firstFrame scope; fresh Chromium process per variant.',
  limitations:'DevTools statistical JavaScript stack samples, not GPU execution. SwiftShader software renderer; sampling and scheduling overhead, small-N A/B, no iOS hardware/FPS implication.',
  runs:[]
 };
 for(const seed of [23,97]){
  for(const gpuWarmup of ['1','0']){
   browser=await chromium.launch({headless:true,
    ...(process.env.FIELDWORK_CI_CHROME&&binary?{executablePath:binary}:{}),
    args:['--use-gl=angle','--use-angle=swiftshader',
     '--enable-unsafe-swiftshader']});
   const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1,hasTouch:true,isMobile:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let finishProfile;
   const profilePromise=new Promise(resolve=>{finishProfile=resolve;});
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Profiler.enable');
   cdp.on('Profiler.consoleProfileFinished',event=>{
    if(event.title==='fieldwork-e6.9-first-frame')finishProfile(event.profile);
   });
   try{
    await page.goto(base+'/breach.html?cpuTrace=1&gpuWarmup='+gpuWarmup,
     {waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'QUICK PLAY',exact:true}).
     click({timeout:60000});
    const dialog=page.getByRole('dialog',{name:'Quick Play mission setup'});
    await dialog.waitFor({state:'visible',timeout:60000});
    // The seed is a deliberate advanced choice in the compact setup UI.
    const advanced=dialog.locator('details.fw-quick-config-advanced');
    if(!(await advanced.evaluate(element=>element.open)))
     await advanced.locator('summary').click();
    await dialog.getByRole('spinbutton',{name:'Seed, blank for random'}).
     fill(String(seed));
    await dialog.getByRole('button',{name:'GENERATE MISSION'}).click();
    await page.waitForFunction(seed=>window.__fieldworkE69?.seed===seed,
     seed,{timeout:180000});
    const meta=await page.evaluate(()=>window.__fieldworkE69);
    if(meta.schema!=='fieldwork-e6.9-cold-cpu-v1')
     throw Error('E6.9 browser marker missing');
    const profile=await Promise.race([profilePromise,
     wait(15000).then(()=>{throw Error('CDP consoleProfileFinished missing');})]);
    const summary=summarizeColdCpuProfile(profile);
    if(summary.sampleCount<10)throw Error('Insufficient CPU samples for cold draw');
    if(summary.profileWallMs<10)
     throw Error('Profiler did not cover synchronous first frame');
    if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
    const prefix=dir+'/seed-'+seed+'-warmup-'+gpuWarmup;
    writeFileSync(prefix+'.cpuprofile',JSON.stringify(profile));
    writeFileSync(prefix+'.json',JSON.stringify({meta,summary},null,2)+'\n');
    result.runs.push({seed,gpuWarmup,
      firstFrameWallMs:meta.firstFrameMs,
      compileAsyncWallMs:meta.shaderPreparationMs,
      sampleCount:summary.sampleCount,
      sampleIntervalMs:summary.sampledIntervalMs,
      profileWallMs:summary.profileWallMs,
      buckets:summary.approximateBuckets,
      topExclusiveSampleFrames:summary.topExclusiveSampleFrames.slice(0,10),
      capture:prefix+'.json',rawProfile:prefix+'.cpuprofile',
      browserErrors:errors.length});
   }finally{
    await cdp.detach().catch(()=>{});
    await page.close();await browser.close();browser=undefined;
   }
  }
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(result,null,2)+'\n');
 console.log('E6_9_COLD_CPU',JSON.stringify(result));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
