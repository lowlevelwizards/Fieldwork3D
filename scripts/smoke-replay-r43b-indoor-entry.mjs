/** B12: a real four-operator, two-room indoor mission replayed from one
 * operator's camera. Validates 3D enclosure, threshold chronology and rewind.
 * SwiftShader is for functional/visual smoke, NOT physical iPhone FPS.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4213,url='http://127.0.0.1:'+port+'/?quick=1&seed=23&bodycamqa=1';
const out='artifacts/replay-r43b-bodycam';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const check=(yes,why)=>{if(!yes)throw Error(why);};
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const diagnostics=page=>page.evaluate(()=>
  window.__fieldworkBodycamQa?.diagnostic());
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  check(ready,'Vite indoor-entry smoke server failed');
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
  const staged=await page.evaluate(()=>
    window.__fieldworkBodycamQa.prepareIndoorEntry());
  check(staged,'Four real indoor MOVE plans were not authored');
  await page.locator('#play').click();
  await page.waitForFunction(()=>{
    const review=window.__fieldworkBodycamQa.indoorEntryReview();
    return review?.crossings.filter(c=>c.crossedAt!==null).length===4;
  },null,{timeout:100000});
  const entry=await page.evaluate(()=>
    window.__fieldworkBodycamQa.indoorEntryReview());
  check(entry?.spreadSeconds!==null&&entry?.crossings.length===4,
    'No four-operator recorded threshold flow');
  let entered=false;
  for(let i=0;i<9&&!entered;i++){
    await page.evaluate(()=>document.querySelector('#watchReplay')?.click());
    entered=await page.locator('#replayPanel').isVisible();
    if(!entered)await page.waitForTimeout(350);
  }
  check(entered,'Indoor mission replay could not be opened');
  await page.locator('#replayMore').click();
  await page.locator('#replayBodycam').click();
  await page.waitForFunction(()=>window.__fieldworkBodycamQa?.
    diagnostic()?.active===true,null,{timeout:30000});
  const seek=async t=>{
    const previous=(await diagnostics(page))?.frame??-1;
    check(await page.evaluate(x=>window.__fieldworkBodycamQa.seek(x),t),
      'Cannot seek indoor film');
    await page.waitForFunction(({previous,t})=>{
      const d=window.__fieldworkBodycamQa.diagnostic();
      return d?.active&&d.frame>previous&&
        Math.abs((d.at??-100)-t)<.15;
    },{previous,t},{timeout:30000});
    const qa=await diagnostics(page);
    check(qa.maskRestored&&qa.transparentWalls===0,
      'First person leaked hidden rig or translucent walls');
    check(qa.knownRoofs>=1,
      'Interior roof geometry missing from historical 3D view');
    return qa;
  };
  const crossing=entry.crossings.find(c=>c.actorId==='rook')?.crossedAt;
  check(crossing!==null&&crossing!==undefined,
    'Camera owner did not cross threshold');
  const approach=await seek(Math.max(0,crossing-.65));
  await mkdir(out,{recursive:true});
  await page.locator('#breach3dCanvas').screenshot({
    path:out+'/entry-approach.png'});
  const inside=await seek(Math.min(entry.end,crossing+.75));
  await page.locator('#breach3dCanvas').screenshot({
    path:out+'/entry-inside.png'});
  const moved=distance(approach.position,inside.position);
  check(moved>3,'Camera did not move through room doorway: '+moved);
  const rewound=await seek(Math.max(0,crossing-.65));
  const drift=distance(approach.position,rewound.position);
  check(drift<.01&&distance(approach.direction,rewound.direction)<.001,
    'Interior camera rewind drifted');
  await page.locator('#replayBodycamMount').click();
  const helmet=await diagnostics(page);
  await page.waitForFunction(previous=>{
    const d=window.__fieldworkBodycamQa.diagnostic();
    return d?.active&&d.frame>previous;
  },helmet.frame??-1,{timeout:30000});
  check((await diagnostics(page)).maskRestored,
    'Changing helmet mount leaked the owner mesh');
  await page.locator('#replayExit').click();
  check(!(await diagnostics(page))?.active,
    'Exited indoor film without restoring tactical mode');
  check(!errors.length,'Browser errors: '+errors.join(' | '));
  const report={entry,approach:approach.position,
    inside:inside.position,cameraTravel:moved,rewindDrift:drift,
    softwareOnly:true};
  await writeFile(out+'/indoor-entry-metrics.json',
    JSON.stringify(report,null,2));
  console.log('Replay R4.3b 4-operator indoor entry PASS',
    JSON.stringify({crossings:entry.crossings.map(c=>c.crossedAt),
      spread:entry.spreadSeconds,cameraTravel:moved,drift}));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
