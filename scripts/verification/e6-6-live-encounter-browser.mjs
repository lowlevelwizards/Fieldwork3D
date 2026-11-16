/** E6.6: REAL browser tactical mission profiling, browser/SwiftShader CPU only.
 * Two seeded Quick Play worlds, planning -> execution, capture local JSON.
 * Not an actual iPhone run or hardware GPU timing. No timing thresholds. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4396,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6/browser-encounter';
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
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}catch{}
  await wait(150);
 }
 if(!ready)throw Error('E6.6 tactical Vite server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME&&binary?{executablePath:binary}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const evidence={schema:'fieldwork-e6.6-browser-validation-v1',
  runner:'headless Chromium, ANGLE SwiftShader, mobile viewport emulation',
  caveat:'Browser CPU and RAF samples only; this is not a phone GPU FPS baseline, an actual first-contact guarantee, nor thermal profiling.',
  scenarios:[]};
 for(const seed of [23,97]){
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1,hasTouch:true,isMobile:true,acceptDownloads:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{
   if(msg.type()==='error'&&
    /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(msg.text()))
    errors.push(msg.text());
  });
  try{
   await page.goto(base+'/breach.html?quick=1&seed='+seed+'&perf=1',
    {waitUntil:'domcontentloaded'});
   await page.locator('#breach3dCanvas').waitFor({state:'visible',
    timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='PLANNING',null,{timeout:60000});
   const panel=page.locator(
    'div[aria-label="Fieldwork 60-second performance timeline"]');
   await panel.waitFor({state:'visible',timeout:60000});
   await page.waitForFunction(()=>document.querySelector(
    '[aria-label="Fieldwork 60-second performance timeline"]')?.
    textContent?.includes('E6.5 ALLY CONTEXT'),null,{timeout:60000});
   const canvasBytes=(await page.locator('#breach3dCanvas').screenshot()).byteLength;
   if(canvasBytes<4000)throw Error('E6.6 blank tactical canvas seed '+seed);
   const capture=async(label)=>{
    await page.waitForTimeout(1800);
    const pending=page.waitForEvent('download',{timeout:30000});
    await panel.getByRole('button',{name:'JSON'}).click();
    const download=await pending;
    if(!download.suggestedFilename().endsWith('.json'))
     throw Error('E6.6 capture is not JSON');
    const path=dir+'/seed-'+seed+'-'+label+'.json';
    await download.saveAs(path);
    const data=JSON.parse(readFileSync(path,'utf8'));
    if(data.schema!=='fieldwork-e6.6-encounter-v1'||!data.buckets?.length||
       !data.modeCounts||data.bucketMs!==250)
     throw Error('E6.6 invalid browser capture '+path);
    if(!data.buckets.some(b=>b.peak.scene3dSubmitted!==undefined))
     throw Error('E6.6 detailed scene capture missing '+path);
    if(!data.buckets.some(b=>b.peak.previousWork?.actor?.poseMs!==undefined))
     throw Error('E6.6 pose attribution missing '+path);
    return {phase:label,seed,buckets:data.buckets.length,
     liveCallbacks:data.modeCounts.live.frames,
     idleCallbacks:data.modeCounts.idle.frames,
     peakRafMs:Math.max(...data.buckets.map(b=>b.peak.raf)),
     detailedBuckets:data.buckets.filter(b=>b.peak.previousWork?.actor).length,
     uploadSubmissionsLastObserved:data.buckets.at(-1).peak.
       fogTextureSubmittedUploads??null,
     artifact:path};
   };
   const planning=await capture('planning');
   if(planning.idleCallbacks<2)
    throw Error('E6.6 planning never sampled');
   await page.locator('#play').click();
   await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='EXECUTING',null,{timeout:30000});
   const execution=await capture('execution');
   if(execution.liveCallbacks<2)
    throw Error('E6.6 live execution never sampled');
   if(errors.length)throw Error('E6.6 browser errors: '+errors.join(' | '));
   evidence.scenarios.push({seed,canvasBytes,planning,execution,
    errors:errors.length});
  }finally{await page.close();}
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_6_BROWSER_ENCOUNTER',JSON.stringify(evidence));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
