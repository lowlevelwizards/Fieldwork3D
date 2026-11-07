/** Replay B11: author a real MOVE through the player canvas, execute the
 * authoritative simulation, then seek a moving first-person replay film.
 * SwiftShader frame counts are NOT iPhone FPS or device validation.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4212,url='http://127.0.0.1:'+port+'/?quick=1&seed=23&bodycamqa=1';
const output='artifacts/replay-r43b-bodycam';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const requireCheck=(ok,msg)=>{if(!ok)throw Error(msg);};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const get=page=>page.evaluate(()=>window.__fieldworkBodycamQa?.diagnostic());
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  requireCheck(ready,'Moving Bodycam Vite server did not start');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    hasTouch:true,isMobile:true
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='PLANNING'&&!!document.querySelector('#breach3dCanvas'),
    null,{timeout:60000});
  await page.locator('#rook').click();
  const candidates=await page.evaluate(()=>
    window.__fieldworkBodycamQa.routeCandidates());
  requireCheck(candidates.length>0,
    'No safe on-screen route candidates for real pointer QA');
  let authored=null;
  for(const candidate of candidates){
    await page.mouse.click(candidate.screen.x,candidate.screen.y);
    const plan=await page.evaluate(()=>
      window.__fieldworkBodycamQa.planned());
    if(plan?.path.length){
      authored={...candidate,plan};break;
    }
  }
  requireCheck(!!authored,'Pointer orders did not author a legal movement plan');
  await page.locator('#play').click();
  await page.waitForFunction(()=>{
    const history=window.__fieldworkBodycamQa.motionSamples();
    if(history.length<3)return false;
    const p=history[0].p;
    return history.some(s=>Math.hypot(s.p.x-p.x,s.p.y-p.y)>9);
  },null,{timeout:90000});
  const film=await page.evaluate(()=>
    window.__fieldworkBodycamQa.motionSamples());
  const initial=film[0];
  const motion=[...film].sort((a,b)=>
    Math.hypot(b.p.x-initial.p.x,b.p.y-initial.p.y)-
    Math.hypot(a.p.x-initial.p.x,a.p.y-initial.p.y))[0];
  const actualTravel=Math.hypot(motion.p.x-initial.p.x,
    motion.p.y-initial.p.y);
  requireCheck(actualTravel>9,
    'Real recorded operator motion failed: '+actualTravel);
  let opened=false;
  for(let i=0;i<8&&!opened;i++){
    await page.evaluate(()=>document.querySelector('#watchReplay')?.click());
    opened=await page.locator('#replayPanel').isVisible();
    if(!opened)await page.waitForTimeout(250);
  }
  requireCheck(opened,'Recorded moving mission could not enter replay');
  await page.locator('#replayMore').click();
  await page.locator('#replayBodycam').click();
  await page.waitForFunction(()=>window.__fieldworkBodycamQa?.
    diagnostic()?.active===true,null,{timeout:30000});
  const seek=async at=>{
    const prior=(await get(page))?.frame??-1;
    requireCheck(await page.evaluate(t=>
      window.__fieldworkBodycamQa.seek(t),at),
      'Cannot seek a moving Bodycam film');
    await page.waitForFunction(({prior,at})=>{
      const d=window.__fieldworkBodycamQa.diagnostic();
      return d?.active&&d.frame>prior&&
        Math.abs((d.at??-100)-at)<.15;
    },{prior,at},{timeout:30000});
    const d=await get(page);
    requireCheck(d?.maskRestored&&d.transparentWalls===0,
      'Perspective owner/walls invalid: '+JSON.stringify(d));
    return d;
  };
  const a=await seek(initial.at);
  await mkdir(output,{recursive:true});
  await page.locator('#breach3dCanvas').screenshot({
    path:output+'/moving-start.png'});
  const b=await seek(motion.at);
  await page.locator('#breach3dCanvas').screenshot({
    path:output+'/moving-end.png'});
  const cameraTravel=distance(a.position,b.position);
  requireCheck(cameraTravel>4,
    'Bodycam did not follow real historical motion: '+cameraTravel);
  const rewound=await seek(initial.at);
  const rewindError=distance(a.position,rewound.position);
  requireCheck(rewindError<.01&&distance(a.direction,rewound.direction)<.001,
    'Camera rewind is render-history dependent');
  const frame0=rewound.frame,begin=Date.now();
  await page.waitForTimeout(2500);
  const later=await get(page);
  const frames=Math.max(0,(later?.frame??frame0)-frame0);
  requireCheck(frames>=2,'Bodycam stalled on moving-film playback');
  await page.locator('#replayExit').click();
  requireCheck(!(await get(page))?.active,
    'Perspective renderer not restored after replay exit');
  requireCheck(errors.length===0,
    'Moving Bodycam browser exceptions: '+errors.join(' | '));
  const result={authored,recordedTravel:actualTravel,
    cameraTravel,rewindError,softwareFrames:frames,
    measurementMs:Date.now()-begin,
    warning:'SwiftShader frame cadence is not physical mobile FPS',
    positions:{start:a.position,end:b.position},
    roofCounts:[a.knownRoofs,b.knownRoofs]};
  await writeFile(output+'/moving-metrics.json',
    JSON.stringify(result,null,2));
  console.log('Replay R4.3b moving-operator Bodycam QA PASS',
    JSON.stringify(result));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
