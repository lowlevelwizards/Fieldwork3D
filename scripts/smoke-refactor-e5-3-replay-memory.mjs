/** E5.3: REAL Chrome, actual IndexedDB saved replay, repeated UI
 * enter/seek/disclosure/filter/exit cycles with CDP post-GC heap+DOM.
 * Chromium emulated phone is NOT mobile Safari or real GPU/phone timing.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {verifyReplayLifecycleMemory}
 from './verification/refactor-e5-browser-memory-contract.mjs';

const port=4289,base='http://127.0.0.1:'+port;
const root='artifacts/refactor-e5-3';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const check=(ok,message)=>{if(!ok)throw Error(message);};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
async function sample(page,cdp,cycle){
 await cdp.send('HeapProfiler.collectGarbage');
 const [heap,dom]=await Promise.all([
  cdp.send('Runtime.getHeapUsage'),
  cdp.send('Memory.getDOMCounters')
 ]);
 const pageState=await page.evaluate(()=>({
  replayClosed:document.querySelector('#replayPanel')?.hidden===true,
  feedButtons:document.querySelectorAll('#replayFeed [data-event-key]').length,
  phase:document.querySelector('#phase')?.textContent,
  liveClock:document.querySelector('#clock')?.textContent,
  libraryVisible:document.querySelector('#replayLibraryDialog')?.hidden===false
 }));
 return {cycle,usedHeapBytes:heap.usedSize,totalHeapBytes:heap.totalSize,
  nodes:dom.nodes,detachedNodes:dom.detachedNodes,documents:dom.documents,
  ...pageState};
}
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base)).ok){ready=true;break;}}catch{}
  await sleep(200);
 }
 check(ready,'E5.3 Vite server did not start');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader','--enable-precise-memory-info']
 });
 const page=await browser.newPage({viewport:{width:390,height:844},
  deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/?quick=1&seed=23',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>
  document.querySelector('#phase')?.textContent==='PLANNING'&&
  !!document.querySelector('#openReplayLibrary'),null,{timeout:60000});
 // A real archived recorder, with 20Hz frames and authored sight, rather
 // than a fake UI toggle. Stored archive persists beyond the first page.
 const film=await page.evaluate(async()=>{
  const [{newSession},{MissionRecorder},{captureReplayArchive},
   {saveReplayArchive,listSavedReplays}]=await Promise.all([
   import('/src/breach-game.ts'),import('/src/breach-replay.ts'),
   import('/src/breach-replay-archive.ts'),import('/src/breach-replay-library.ts')
  ]);
  const state=newSession(0,3948),recorder=new MissionRecorder();
  recorder.capture(state,true);
  for(let i=1;i<=240;i++){
   state.seconds=i*.05;
   recorder.capture(state,true);
  }
  const archive=captureReplayArchive(recorder,'e5-3-heap-lifecycle',1712345678900);
  await saveReplayArchive(archive);
  return {frames:recorder.frames.length,
   duration:recorder.duration,
   libraryCount:(await listSavedReplays()).length};
 });
 check(film.frames>=200&&film.duration>=10&&film.libraryCount===1,
  'E5.3 expected 12-second real 20Hz archived film: '+JSON.stringify(film));
 // Reload frees the test fixture's standalone recorder so the browser
 // measures actual library playback, not the fixture closure.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>
  document.querySelector('#phase')?.textContent==='PLANNING',
  null,{timeout:60000});
 await page.evaluate(()=>document.querySelector('#openReplayLibrary')?.click());
 await page.locator('#replayLibraryList .replay-library-watch').first()
  .waitFor({state:'visible',timeout:20000});
 const cdp=await page.context().newCDPSession(page);
 const samples=[],openSamples=[];
 const firstClock=await page.locator('#clock').textContent();
 for(let cycle=0;cycle<6;cycle++){
  await page.locator('#replayLibraryList .replay-library-watch').first().click();
  await page.locator('#replayPanel').waitFor({state:'visible',timeout:30000});
  // A saved film can play immediately; stop it before doing repeatable
  // seeks so each cycle measures the same presentation and cache state.
  if(await page.locator('#replayPlay').getAttribute('data-mode')==='pause')
   await page.locator('#replayPlay').click();
  await page.locator('#replayFeedToggle').click();
  await page.locator('#replayFeedPanel').waitFor({state:'visible',timeout:15000});
  const events=page.locator('#replayFeedPanel [data-moments-view="events"]');
  if(await events.count())await events.first().click();
  for(const [filter,time] of [
   ['all',1.5],['combat',3],['orders',7],['contacts',10],['all',2]
  ]){
   await page.locator('#replayFeedFilter').evaluate((node,value)=>{
    node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));
   },filter);
   await page.locator('#replaySeek').evaluate((node,t)=>{
    node.value=String(Math.round(t*60));
    node.dispatchEvent(new Event('input',{bubbles:true}));
    node.dispatchEvent(new Event('change',{bubbles:true}));
   },time);
  }
  if(cycle>=2){
   const opened=await sample(page,cdp,cycle);
   openSamples.push(opened);
  }
  await page.locator('#replayExit').click();
  await page.locator('#replayPanel').waitFor({state:'hidden',timeout:20000});
  await page.locator('#replayLibraryDialog').waitFor({state:'visible',timeout:20000});
  const exit=await sample(page,cdp,cycle);
  check(exit.replayClosed&&exit.feedButtons===0,
   'Replay exit retained feed or failed to restore library: '+JSON.stringify(exit));
  check(exit.liveClock===firstClock,
   'Recorded playback modified the paused live timeline: '+JSON.stringify(exit));
  if(cycle>=2)samples.push(exit);
 }
 const report=verifyReplayLifecycleMemory(samples);
 check(openSamples.every(x=>x.feedButtons<=80),
  'E5.3 bounded Events viewport exceeded 80 DOM buttons');
 check(!errors.length,'Runtime errors during replay lifecycle: '+errors.join(' | '));
 const output={stage:'E5.3',browser:'Chromium via Playwright/CDP',
  device:'390x844 emulated mobile viewport, software WebGL',
  film, warmupCycles:2,measuredCycles:4,
  summary:report,postExit:samples,insideReplay:openSamples,
  limitation:'Chromium GC samples are observational; does not measure real iOS Safari, device FPS, GPU memory or GC pause latency'};
 await mkdir(root,{recursive:true});
 await writeFile(root+'/replay-memory.json',JSON.stringify(output,null,2)+'\n');
 console.log('E5_3_BROWSER_MEMORY',JSON.stringify(output));
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
