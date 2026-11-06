/** Replay R3: single browser gate for real IndexedDB roundtrip + library UI.
 * No full visual audit, combat stress suite or GPU-dependent video capture.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4199,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const check=(condition,msg)=>{if(!condition)throw Error(msg);};
let browser;
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(base)).ok){ready=true;break;}}catch{}
    await new Promise(done=>setTimeout(done,180));
  }
  check(ready,'Replay library Vite server failed to start');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base+'/?quick=1&seed=23',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    document.querySelector('#phase')?.textContent==='PLANNING'&&
    !!document.querySelector('#openReplayLibrary'),null,{timeout:60000});
  const first=await page.evaluate(async()=>{
    const [{newSession},{MissionRecorder},{captureReplayArchive},
      {saveReplayArchive,listSavedReplays,replayLibrarySupported}]=
      await Promise.all([
        import('/src/breach-game.ts'),import('/src/breach-replay.ts'),
        import('/src/breach-replay-archive.ts'),
        import('/src/breach-replay-library.ts')
      ]);
    const s=newSession(0,3948),r=new MissionRecorder();
    r.capture(s,true);s.seconds=.1;r.capture(s,true);
    const archive=captureReplayArchive(r,'replay-browser-001',1712345678900);
    await saveReplayArchive(archive);
    const index=await listSavedReplays();
    return {supported:replayLibrarySupported(),index,
      duration:archive.frames.at(-1).t};
  });
  check(first.supported,'IndexedDB is unavailable in browser');
  check(first.index.length===1&&first.index[0].frameCount===2,
    'IndexedDB did not save the complete film');
  check(first.duration===.1,'Test film duration was corrupted');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    document.querySelector('#phase')?.textContent==='PLANNING',null,
    {timeout:60000});
  const loaded=await page.evaluate(async()=>{
    const [{listSavedReplays,loadSavedReplay},
      {restoreReplayArchive}]=await Promise.all([
        import('/src/breach-replay-library.ts'),
        import('/src/breach-replay-archive.ts')
      ]);
    const index=await listSavedReplays();
    const recording=restoreReplayArchive(await loadSavedReplay('replay-browser-001'));
    return {count:index.length,duration:recording.duration,
      site:recording.manifest.site?.seed,
      motionActors:recording.motion.toArchive().actors.length};
  });
  check(loaded.count===1&&loaded.duration===.1,
    'Browser reload did not preserve/load the historical mission');
  check(loaded.site===3948,'Saved replay lost its resolved site');
  await page.evaluate(()=>document.querySelector('#openReplayLibrary').click());
  await page.waitForFunction(()=>
    document.querySelector('#replayLibraryDialog')?.hidden===false&&
    document.querySelectorAll('.replay-library-row').length===1,
    null,{timeout:12000});
  const dialog=await page.evaluate(()=>{
    const modal=document.querySelector('#replayLibraryDialog');
    const r=modal.getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,height:r.height,width:r.width,
      backdrop:document.querySelector('#replayLibraryBackdrop').hidden};
  });
  check(dialog.top>=0&&dialog.bottom<=844&&dialog.width<=390,
    'Mobile library exceeds screen: '+JSON.stringify(dialog));
  check(!dialog.backdrop,'Library must block underlying battlefield interaction');
  await page.locator('.replay-library-row button[aria-label="Favorite replay"]').click();
  await page.waitForFunction(()=>
    document.querySelector('.replay-library-row button[aria-pressed="true"]'));
  await page.locator('.replay-library-row button').first().click();
  await page.waitForFunction(()=>
    document.querySelector('#replayPanel')?.hidden===false,null,{timeout:15000});
  await page.evaluate(()=>document.querySelector('#replayExit').click());
  check(await page.evaluate(()=>document.querySelector('#replayPanel').hidden),
    'Exiting imported replay should restore the previous live mission');
  await page.evaluate(()=>document.querySelector('#openReplayLibrary').click());
  await page.waitForFunction(()=>
    document.querySelectorAll('.replay-library-row').length===1,
    null,{timeout:12000});
  await page.locator('.replay-library-row button[aria-label^="Delete replay"]').click();
  check((await page.locator('.replay-library-row button[data-confirm="yes"]')
    .count())===1,'Delete must require a second confirmation');
  await page.locator('.replay-library-row button[data-confirm="yes"]').click();
  await page.waitForFunction(()=>
    document.querySelectorAll('.replay-library-row').length===0,null,
    {timeout:12000});
  check(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('Replay R3 library smoke PASS',
    JSON.stringify({duration:loaded.duration,site:loaded.site,
      filmFrames:first.index[0].frameCount,dialog}));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
