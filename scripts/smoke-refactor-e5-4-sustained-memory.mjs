/** E5.4: sustained Chrome/IndexedDB replay capture, replacement and
 * lifecycle evidence. Real saved 60-second 20Hz film with 800 recorded events.
 * Chrome mobile viewport + software WebGL, NOT physical iOS Safari.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {verifySustainedReplayMemory}
 from './verification/refactor-e5-sustained-contract.mjs';

const port=4291,base='http://127.0.0.1:'+port;
const root='artifacts/refactor-e5-4',id='e5-4-sustained';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
async function memory(page,cdp,cycle){
 await cdp.send('HeapProfiler.collectGarbage');
 const [heap,dom]=await Promise.all([
  cdp.send('Runtime.getHeapUsage'),cdp.send('Memory.getDOMCounters')]);
 const state=await page.evaluate(()=>({
  replayClosed:document.querySelector('#replayPanel')?.hidden===true,
  libraryVisible:document.querySelector('#replayLibraryDialog')?.hidden===false,
  feedButtons:document.querySelectorAll('#replayFeed [data-event-key]').length,
  liveClock:document.querySelector('#clock')?.textContent
 }));
 return {cycle,usedHeapBytes:heap.usedSize,totalHeapBytes:heap.totalSize,
  nodes:dom.nodes,listeners:dom.jsEventListeners,documents:dom.documents,
  ...state};
}
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base)).ok){ready=true;break;}}catch{}
  await sleep(200);
 }
 check(ready,'E5.4 Vite server unavailable');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader','--enable-precise-memory-info']});
 const page=await browser.newPage({viewport:{width:390,height:844},
  deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?quick=1&seed=23',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>
  document.querySelector('#phase')?.textContent==='PLANNING'&&
  !!document.querySelector('#openReplayLibrary'),null,{timeout:60000});
 // A truly replayable archive captured through the actual 20Hz outcome
 // recorder. Simulation never executes in the fixture, so these are authored
 // static/moving samples and battle-journal events, not combat outcomes.
 const film=await page.evaluate(async()=>{
  const [{newSession},{MissionRecorder},{captureReplayArchive},
   {saveReplayArchive,listSavedReplays}]=await Promise.all([
    import('/src/breach-game.ts'),import('/src/breach-replay.ts'),
    import('/src/breach-replay-archive.ts'),
    import('/src/breach-replay-library.ts')
  ]);
  const state=newSession(0,3948),rec=new MissionRecorder();
  const actor=state.operators.find(a=>a.side==='blue');
  if(!actor)throw Error('No friendly actor in replay fixture');
  let nextId=1;
  rec.capture(state,true);
  for(let i=1;i<=1200;i++){
   state.seconds=i*.05;
   if(i%3!==0)state.battleEvents.push({
    id:nextId++,t:state.seconds,actor:actor.id,
    kind:i%2===0?'door':'intel',
    text:'E5.4 A RECORDED '+i,
    p:{x:actor.p.x,y:actor.p.y}
   });
   // Incremental, deliberately small in-place motion; the recorder
   // must copy changing poses without corrupting prior frames.
   if(i%2===0)actor.p.x+=.02;
   rec.capture(state,true);
  }
  const archive=captureReplayArchive(rec,'e5-4-sustained',1712345678900);
  await saveReplayArchive(archive);
  return {frames:rec.frames.length,events:rec.events.length,
    duration:rec.duration,libraryCount:(await listSavedReplays()).length};
 });
 check(film.frames===1201&&film.events===800&&film.duration===60&&
  film.libraryCount===1,'Invalid E5.4 long film: '+JSON.stringify(film));
 // Remove all capture fixture objects before measuring rehydration.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>
  document.querySelector('#phase')?.textContent==='PLANNING',
  null,{timeout:60000});
 await page.evaluate(()=>document.querySelector('#openReplayLibrary')?.click());
 await page.locator('#replayLibraryList .replay-library-watch').first()
  .waitFor({state:'visible',timeout:20000});
 const cdp=await page.context().newCDPSession(page);
 const firstClock=await page.locator('#clock').textContent();
 const observed=[],rows=[],summary=[];
 for(let cycle=0;cycle<6;cycle++){
  const expectedVersion=cycle%2===0?'A':'B';
  // Replacing precisely the same IndexedDB key forces each library entry
  // to reload fresh evidence. No second library item may be introduced.
  const replacement=await page.evaluate(async(version)=>{
   const {loadSavedReplay,saveReplayArchive,listSavedReplays}=
    await import('/src/breach-replay-library.ts');
   const archive=await loadSavedReplay('e5-4-sustained');
   archive.battleEvents=archive.battleEvents.map(e=>({
    ...e,text:e.text.replace(/E5\.4 [AB] RECORDED/,'E5.4 '+version+' RECORDED')
   }));
   await saveReplayArchive(archive);
   const restored=await loadSavedReplay('e5-4-sustained');
   return {
    libraryCount:(await listSavedReplays()).length,
    frames:restored.frames.length,events:restored.battleEvents.length,
    visible:restored.battleEvents[0]?.text??''
   };
  },expectedVersion);
  check(replacement.libraryCount===1&&replacement.frames===film.frames&&
    replacement.events===film.events&&
    replacement.visible.includes('E5.4 '+expectedVersion+' RECORDED'),
    'Same-key archive revision failed: '+JSON.stringify(replacement));
  await page.locator('#replayLibraryList .replay-library-watch').first().click();
  await page.locator('#replayPanel').waitFor({state:'visible',timeout:30000});
  if(await page.locator('#replayPlay').getAttribute('data-mode')==='pause')
   await page.locator('#replayPlay').click();
  await page.locator('#replayFeedToggle').click();
  await page.locator('#replayFeedPanel').waitFor({state:'visible',timeout:15000});
  const eventMode=page.locator('#replayFeedPanel [data-moments-view="events"]');
  if(await eventMode.count())await eventMode.first().click();
  for(const [filter,t] of [
   ['all',1],['orders',12],['contacts',27],['all',54],['combat',45],
   ['all',7],['all',59],['all',2]
  ]){
   await page.locator('#replayFeedFilter').evaluate((node,value)=>{
    node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));
   },filter);
   await page.locator('#replaySeek').evaluate((node,time)=>{
    node.value=String(Math.round(time*60));
    node.dispatchEvent(new Event('input',{bubbles:true}));
    node.dispatchEvent(new Event('change',{bubbles:true}));
   },t);
  }
  const textOfFirst=await page.locator('#replayFeed [data-event-key]').first()
   .textContent({timeout:15000});
  const observedVersion=textOfFirst?.match(/E5\.4 ([AB]) RECORDED/)?.[1]??null;
  const before=await memory(page,cdp,cycle);
  check(before.feedButtons===80,
   'Sustained replay must render the bounded 80-event viewport: '+
     JSON.stringify(before));
  check(observedVersion===expectedVersion,
   'Replay displayed stale archive revision '+JSON.stringify({
     expectedVersion,observedVersion,firstEvent:textOfFirst
   }));
  observed.push({...before,expectedVersion,observedVersion});
  await page.locator('#replayExit').click();
  await page.locator('#replayPanel').waitFor({state:'hidden',timeout:20000});
  await page.locator('#replayLibraryDialog').waitFor({state:'visible',timeout:20000});
  const postExit=await memory(page,cdp,cycle);
  check(postExit.libraryVisible&&postExit.replayClosed&&
    postExit.feedButtons===0&&postExit.liveClock===firstClock,
   'Sustained replay exit retained UI or changed mission: '+
    JSON.stringify(postExit));
  rows.push({cycle,frames:film.frames,events:film.events,
   libraryCount:replacement.libraryCount,
   expectedVersion,observedVersion,liveClock:postExit.liveClock,
   postExit});
  if(cycle>=2)summary.push(rows.at(-1));
 }
 const report=verifySustainedReplayMemory(summary);
 check(!errors.length,'E5.4 runtime errors: '+errors.join(' | '));
 const output={stage:'E5.4',fixture:'60s 20Hz / 800 recorded events',
  browser:'Chromium CDP with software WebGL and emulated mobile viewport',
  warmupCycles:2,measuredCycles:4,film,
  summary:report,openSamples:observed,cycles:rows,
  caveat:'Heap is observational; no Safari, GPU, device FPS, or measured GC pauses'};
 await mkdir(root,{recursive:true});
 await writeFile(root+'/sustained-memory.json',JSON.stringify(output,null,2)+'\n');
 console.log('E5_4_SUSTAINED',JSON.stringify({
  film,summary:report,openedFeedButtons:Math.max(...observed.map(x=>x.feedButtons)),
  postExit:summary.map(x=>x.postExit)
 }));
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
