/** E6.11: test opt-in local device evidence, real download and 90 RAF
 * samples in an actual browser. Chromium SwiftShader is not iPhone hardware.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const port=4402,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-11/device-cold';
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
 if(!ready)throw Error('E6.11 Vite server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const summary={
  schema:'fieldwork-e6.11-browser-device-export-v1',
  runner:'Fresh Chrome process per seed/variant, touch viewport emulation, ANGLE SwiftShader',
  limitations:'This verifies the telemetry/export plumbing and relative phases, NOT Safari or real device hardware performance.',
  runs:[]
 };
 for(const seed of [23,97]){
  for(const coldPrewarm of ['1','0']){
   browser=await chromium.launch({headless:true,
    ...(process.env.FIELDWORK_CI_CHROME&&binary?{executablePath:binary}:{}),
    args:['--use-gl=angle','--use-angle=swiftshader',
     '--enable-unsafe-swiftshader']});
   const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1,hasTouch:true,isMobile:true,acceptDownloads:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+'/breach.html?coldBench=1&gpuTrace=1&gpuWarmup=1&coldPrewarm='+coldPrewarm,
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
    await page.waitForFunction(seed=>window.__fieldworkE611?.run?.seed===seed,
      seed,{timeout:180000});
    await page.waitForFunction(()=>
      window.__fieldworkE611?.postReadyFrames?.frames===90,
      null,{timeout:60000});
    const button=page.getByRole('button',
      {name:'Export cold start benchmark JSON'});
    await button.waitFor({state:'visible',timeout:15000});
    const [download]=await Promise.all([page.waitForEvent('download'),
      button.click()]);
    if(!download.suggestedFilename().endsWith('.json'))
      throw Error('E6.11 export did not create JSON download');
    const raw=readFileSync(await download.path(),'utf8');
    const evidence=JSON.parse(raw);
    if(evidence.schema!=='fieldwork-e6.11-device-cold-v1'||
       evidence.run.seed!==seed||
       evidence.run.prewarmEnabled!==(coldPrewarm==='1')||
       evidence.run.instrumentedWebGl!==true)
      throw Error('Invalid exported E6.11 identity or run flags');
    if(!Array.isArray(evidence.glPhases)||
       evidence.glPhases.length<(coldPrewarm==='1'?3:2))
      throw Error('Missing WebGL phase diagnostics');
    if(evidence.postReadyFrames.frames!==90||
       evidence.postReadyFrames.p95Ms===null)
      throw Error('Missing 90 post-ready RAF intervals');
    if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
    const prefix=dir+'/seed-'+seed+'-preflight-'+coldPrewarm;
    writeFileSync(prefix+'.json',JSON.stringify(evidence,null,2)+'\n');
    const first=evidence.glPhases.find(x=>x.phase==='firstFrame');
    if(!first||first.wallMs<=0)
      throw Error('No measured first-frame phase in export');
    summary.runs.push({seed,coldPrewarm,
      firstFrameMs:evidence.phases.firstFrameMs,
      preflightMs:evidence.phases.preflightMs,
      startupTotalMs:evidence.phases.totalMs,
      gpuLogWallMs:first.programInfoLogMs,
      remainingUnmeasuredWallMs:first.unmeasuredWallMs,
      postReadyP95Ms:evidence.postReadyFrames.p95Ms,
      postReadyWorstMs:evidence.postReadyFrames.worstMs,
      exportBytes:Buffer.byteLength(raw),errors:errors.length,capture:prefix+'.json'});
   }finally{
    await page.close();await browser.close();browser=undefined;
   }
  }
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');
 console.log('E6_11_DEVICE_BROWSER',JSON.stringify(summary));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
