/** E6.13: fresh real-browser evidence for briefing idle 3D hold vs baseline.
 * All results are Chromium/ANGLE software renderer, not iPhone GPU timings.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4404,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-13/briefing-idle';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<150;i++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}
  catch{}await wait(150);
 }
 if(!ready)throw Error('E6.13 dev server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const summary={schema:'fieldwork-e6.13-briefing-idle-v1',
  warning:'Only planning-mode under a blur shield, not live simulation or mobile hardware. Browser GL hooks below observe draw submission without changing the game renderer.',
  runs:[]};
 for(const seed of [23,97]){
  for(const briefingIdle of ['0','1']){
   browser=await chromium.launch({headless:true,
    ...(process.env.FIELDWORK_CI_CHROME&&binary?{executablePath:binary}:{}),
    args:['--use-gl=angle','--use-angle=swiftshader',
     '--enable-unsafe-swiftshader']});
   const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1,hasTouch:true,isMobile:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+'/breach.html?coldBench=1&briefingIdle='+briefingIdle+
      '&gpuWarmup=1&coldPrewarm=1',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'QUICK PLAY',exact:true})
      .click({timeout:60000});
    const setup=page.getByRole('dialog',{name:'Quick Play mission setup'});
    await setup.waitFor({state:'visible',timeout:60000});
    // The seed is a deliberate advanced choice in the compact setup UI.
    const advanced=setup.locator('details.fw-quick-config-advanced');
    if(!(await advanced.evaluate(element=>element.open)))
     await advanced.locator('summary').click();
    await setup.getByRole('spinbutton',{name:'Seed, blank for random'})
      .fill(String(seed));
    await setup.getByRole('button',{name:'GENERATE MISSION'}).click();
    await page.waitForFunction(seed=>
      window.__fieldworkE611?.run?.seed===seed&&
      window.__fieldworkE611?.postReadyRuntime?.frames===90,
      seed,{timeout:180000});
    const sample=await page.evaluate(()=>window.__fieldworkE611);
    const runtime=sample.postReadyRuntime;
    if(runtime.byMode.live.frames!==0||runtime.byMode.idle.frames!==90)
      throw Error('Unexpected tactical mode; briefing test requires 90 idle samples');
    if(briefingIdle==='1'&&runtime.byMode.idle.submitted3D>4)
      throw Error('Briefing idle hold did not reduce covered 3D submissions');
    if(briefingIdle==='0'&&runtime.byMode.idle.submitted3D<85)
      throw Error('Baseline should submit normal 3D every idle frame');
    const panel=page.locator('#briefingPanel');
    await panel.waitFor({state:'visible',timeout:15000});
    // Inspect actual GL draws after dismissal, not just a policy value.
    // No new GPU sync or readbacks; methods are restored by closing browser.
    const instrumented=await page.locator('#breach3dCanvas')
     .evaluate(canvas=>{
      const gl=canvas.getContext('webgl2');
      if(!gl)return false;
      window.__e613DrawCalls=0;
      for(const name of ['drawElements','drawArrays',
       'drawElementsInstanced','drawArraysInstanced']){
       const original=gl[name];
       if(typeof original!=='function')continue;
       gl[name]=function(...args){
        window.__e613DrawCalls++;
        return Reflect.apply(original,gl,args);
       };
      }
      return true;
     });
    if(!instrumented)throw Error('Existing WebGL2 canvas context unavailable');
    await page.locator('#briefingClose').click({timeout:20000});
    await page.waitForFunction(()=>
      document.getElementById('briefingPanel')?.hidden===true&&
      window.__e613DrawCalls>0,null,{timeout:15000});
    const prefix=dir+'/seed-'+seed+'-briefing-'+briefingIdle;
    await page.locator('#breach3dCanvas').screenshot({
      path:prefix+'.png',timeout:20000});
    const recoveredDrawCalls=await page.evaluate(()=>window.__e613DrawCalls);
    if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
    const evidence={seed,briefingIdle,
      savedSamples:runtime.frames,
      idleFrames:runtime.byMode.idle.frames,
      liveFrames:runtime.byMode.live.frames,
      covered3DSubmissions:runtime.byMode.idle.submitted3D,
      runtimeP95GapMs:runtime.p95GapMs,
      runtimeP95CallbackMs:runtime.p95CallbackMs,
      maxGapMs:runtime.worstGapMs,
      afterDismissalDrawCalls:recoveredDrawCalls,
      screenshot:prefix+'.png',errors:errors.length};
    summary.runs.push(evidence);
    writeFileSync(prefix+'.json',JSON.stringify(evidence,null,2)+'\n');
   }finally{
    await page.close();await browser.close();browser=undefined;
   }
  }
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');
 console.log('E6_13_BRIEFING_IDLE',JSON.stringify(summary));
}finally{
 await browser?.close();server.kill('SIGTERM');
}
