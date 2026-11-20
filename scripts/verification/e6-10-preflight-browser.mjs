/** E6.10: matched, cold startup A/B with actual staged scene preflight ON/OFF.
 * Chromium ANGLE SwiftShader is software rendering, not iPhone hardware.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';

const port=4401,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-10/cold-first-frame';
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
 if(!ready)throw Error('E6.10 Vite server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const evidence={
  schema:'fieldwork-e6.10-cold-preflight-ab-v1',
  method:'fresh Chromium process per run; Quick Play creator; actual first frame after gpuWarmup=1; coldPrewarm=1 vs 0',
  warning:'All times are browser/driver CPU wall time. SwiftShader, not physical GPU or iOS Safari. Small-N, OS cache, background scheduling and shader variants may confound totals; screenshot comparisons require visual inspection.',
  runs:[]
 };
 for(const seed of [23,97]){
  for(const coldPrewarm of ['0','1']){
   browser=await chromium.launch({headless:true,
    ...(process.env.FIELDWORK_CI_CHROME&&binary?{executablePath:binary}:{}),
    args:['--use-gl=angle','--use-angle=swiftshader',
     '--enable-unsafe-swiftshader']});
   const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1,hasTouch:true,isMobile:true});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',msg=>{
    if(msg.type()==='error'&&
       /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.
        test(msg.text()))errors.push(msg.text());
   });
   try{
    await page.goto(base+'/breach.html?gpuTrace=1&gpuWarmup=1&coldPrewarm='+
     coldPrewarm,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'QUICK PLAY',exact:true}).
     click({timeout:60000});
    const dialog=page.getByRole('dialog',{name:'Quick Play mission setup'});
    await dialog.waitFor({state:'visible',timeout:60000});
    // The seed is a deliberate advanced choice in the compact setup UI.
    const advanced=dialog.locator('details.fw-quick-config-advanced');
    if(!(await advanced.evaluate(element=>element.open)))
     await advanced.locator(':scope > summary').click();
    await dialog.getByRole('spinbutton',{name:'Seed, blank for random'}).
     fill(String(seed));
    await dialog.getByRole('button',{name:'GENERATE MISSION'}).click();
    await page.waitForFunction(seed=>window.__fieldworkE68?.seed===seed,
     seed,{timeout:180000});
    const trace=await page.evaluate(()=>window.__fieldworkE68);
    if(trace.schema!=='fieldwork-e6.8-cold-renderer-v1')
     throw Error('Missing GL trace schema');
    const preflight=trace.captures.find(x=>x.phase==='preflight');
    const warm=trace.captures.find(x=>x.phase==='compileAsync');
    const first=trace.captures.find(x=>x.phase==='firstFrame');
    if(!warm||!first||trace.captures.filter(x=>x.phase==='firstFrame').length!==1)
     throw Error('Missing warmup or first WebGL draw');
    if(coldPrewarm==='1'&&!preflight)
     throw Error('Preflight enabled but no prepared phase recorded');
    if(coldPrewarm==='0'&&preflight)
     throw Error('Old path requested but preflight unexpectedly ran');
    if(!trace.installedHooks.includes('getProgramInfoLog'))
     throw Error('Missing critical info-log sync hooks');
    if(errors.length)throw Error('Browser shader/page errors: '+errors.join(' | '));
    const prefix=dir+'/seed-'+seed+'-preflight-'+coldPrewarm;
    writeFileSync(prefix+'.json',JSON.stringify(trace,null,2)+'\n');
    // The mission briefing overlays the canvas in the normal UI. For QA
    // capture the actual composited 3D canvas instead of a screenshot of
    // the modal covering it. This page is an isolated throwaway browser.
    await page.locator('#breach3dCanvas').evaluate(canvas=>
      canvas.style.setProperty('z-index','2147483647','important'));
    await page.locator('#breach3dCanvas').screenshot({
     path:prefix+'.png',timeout:20000});
    const sum=(capture,names)=>names.reduce((t,k)=>
     t+(capture?.calls?.[k]?.cpuWallMs??0),0);
    evidence.runs.push({
      seed,coldPrewarm,preflightMs:preflight?.wallMs??0,
      compileAsyncMs:warm.wallMs,firstFrameMs:first.wallMs,
      programInfoLogMs:sum(first,['getProgramInfoLog','getShaderInfoLog']),
      programInfoLogCalls:(first.calls?.getProgramInfoLog?.count??0)+
        (first.calls?.getShaderInfoLog?.count??0),
      programsBeforeCompile:warm.resourcesBefore.programs,
      programsBeforeDraw:first.resourcesBefore.programs,
      programsAfterDraw:first.resourcesAfter.programs,
      startupPhaseMs:(preflight?.wallMs??0)+warm.wallMs+first.wallMs,
      errors:errors.length,capture:prefix+'.json',screenshot:prefix+'.png'
    });
   }finally{
    await page.close();await browser.close();browser=undefined;
   }
  }
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_10_COLD_PREWARM',JSON.stringify(evidence));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
