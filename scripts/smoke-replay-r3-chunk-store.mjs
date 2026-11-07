/** Replay G3b: real Chromium IndexedDB commit/reload/recovery smoke.
 * The existing V1 library continues to work and never sees unpublished V2.
 * No WebGL performance or live long-recording duration claim.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4224,url='http://127.0.0.1:'+port+'/?quick=1&seed=23';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const check=(condition,message)=>{if(!condition)throw Error(message);};
let browser;
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,180));
  }
  check(ready,'Vite chunk storage test server did not start');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    isMobile:true,hasTouch:true
  });
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const staged=await page.evaluate(async()=>{
    const [{newSession},{MissionRecorder},{captureReplayArchive},
      storage,{saveReplayArchive,loadSavedReplay}]=await Promise.all([
      import('/src/breach-game.ts'),
      import('/src/breach-replay.ts'),
      import('/src/breach-replay-archive.ts'),
      import('/src/breach-replay-chunk-store.ts'),
      import('/src/breach-replay-library.ts')
    ]);
    const s=newSession(0,3948),rec=new MissionRecorder();
    for(let i=0;i<8;i++){
      s.seconds=i*.1;rec.capture(s,true);
    }
    const archive=captureReplayArchive(rec,'g3-browser-001',1712345678900);
    archive.optionalEvidence={personalWindows:[{observer:'rook',state:'known'}]};
    await saveReplayArchive(archive); // legacy must remain independent
    const draft=await storage.beginChunkedReplayV2(archive,{chunkFrames:3});
    await storage.appendReplayChunkV2(draft.generation,0,
      archive.frames.slice(0,3));
    let prematureRejected=false;
    try{await storage.commitChunkedReplayV2(draft.generation);}
    catch(e){prematureRejected=String(e).includes('incomplete');}
    const unpublished=await storage.getPublishedChunkedReplayV2(archive.id);
    const pending=await storage.listInterruptedChunkedReplaysV2();
    const v1=await loadSavedReplay(archive.id);
    return {draft,frameCount:archive.frames.length,
      incompleteRejected:prematureRejected,
      unpublished:unpublished===null,
      pending:pending.map(x=>({generation:x.generation,
        writtenFrames:x.writtenFrames})),
      v1Frames:v1.frames.length};
  });
  check(staged.frameCount===8&&staged.incompleteRejected&&staged.unpublished,
    'Incomplete replay was published or rejection missing: '+
    JSON.stringify(staged));
  check(staged.v1Frames===8&&staged.pending.length===1&&
    staged.pending[0].writtenFrames===3,
    'Staging lost progress or affected V1 library');
  await page.reload({waitUntil:'domcontentloaded'});
  const completed=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const archive=await loadSavedReplay('g3-browser-001');
    const pending=await storage.listInterruptedChunkedReplaysV2();
    if(pending.length!==1)throw Error('Recovery draft not found after reload');
    const generation=pending[0].generation;
    await storage.appendReplayChunkV2(generation,1,
      archive.frames.slice(3,6));
    await storage.appendReplayChunkV2(generation,2,
      archive.frames.slice(6,8));
    const release=await storage.commitChunkedReplayV2(generation);
    const opened=await storage.openChunkedReplayV2('g3-browser-001');
    const sample=await opened.window.surrounding(.25);
    const v1=await loadSavedReplay('g3-browser-001');
    const pendingAfter=await storage.listInterruptedChunkedReplaysV2();
    return {generation:release.generation,
      count:release.frameCount,storageComplete:release.storageComplete,
      sidecarEvidence:release.sidecar.optionalEvidence?.personalWindows?.[0]?.state,
      sourceSeed:release.sidecar.manifest.site.seed,
      sample:{previous:sample?.previous.t,next:sample?.next.t,
        alpha:sample?.alpha},
      resident:opened.window.residentCount,
      v1Count:v1.frames.length,
      pending:pendingAfter.length};
  });
  check(completed.storageComplete&&completed.count===8&&
    completed.sourceSeed===3948&&completed.sidecarEvidence==='known'&&
    completed.v1Count===8&&completed.pending===0,
    'Atomic completion lost metadata or V1 library: '+
    JSON.stringify(completed));
  check(completed.sample.previous<.25&&
    completed.sample.next>.25&&completed.resident<=3,
    'Lazy chunk reading disagrees with historical frames: '+
    JSON.stringify(completed));
  const replaced=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const archive=await loadSavedReplay('g3-browser-001');
    const previous=await storage.getPublishedChunkedReplayV2(archive.id);
    const draft=await storage.beginChunkedReplayV2(archive,
      {chunkFrames:3,replace:true});
    await storage.appendReplayChunkV2(draft.generation,0,
      archive.frames.slice(0,3));
    // Force an IDB uniqueness failure on the second chunk. The first
    // successful chunk and progress journal must survive atomically.
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('fieldwork-breach-replay-chunks',1);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    const transaction=(mode,action)=>new Promise((resolve,reject)=>{
      const tx=db.transaction('chunks',mode);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
      action(tx.objectStore('chunks'));
    });
    await transaction('readwrite',store=>store.add({
      generation:draft.generation,index:1,frames:[]
    }));
    let failedAtomic=false;
    try{await storage.appendReplayChunkV2(draft.generation,1,
      archive.frames.slice(3,6));}
    catch{failedAtomic=true;}
    const interrupted=await storage.listInterruptedChunkedReplaysV2();
    const stillPublished=await storage.getPublishedChunkedReplayV2(archive.id);
    await transaction('readwrite',store=>
      store.delete([draft.generation,1]));
    db.close();
    await storage.appendReplayChunkV2(draft.generation,1,
      archive.frames.slice(3,6));
    await storage.appendReplayChunkV2(draft.generation,2,
      archive.frames.slice(6));
    const published=await storage.commitChunkedReplayV2(draft.generation);
    // Two competing writers both start from this same published
    // generation. The later commit must fail rather than clobber.
    const contenderA=await storage.beginChunkedReplayV2(archive,
      {replace:true,chunkFrames:4});
    const contenderB=await storage.beginChunkedReplayV2(archive,
      {replace:true,chunkFrames:4});
    for(const contender of [contenderA,contenderB]){
      await storage.appendReplayChunkV2(contender.generation,0,
        archive.frames.slice(0,4));
      await storage.appendReplayChunkV2(contender.generation,1,
        archive.frames.slice(4,8));
    }
    const winner=await storage.commitChunkedReplayV2(contenderA.generation);
    let raceRejected=false;
    try{await storage.commitChunkedReplayV2(contenderB.generation);}
    catch(e){raceRejected=String(e).includes('replaced');}
    const pendingRace=await storage.listInterruptedChunkedReplaysV2();
    const discarded=await storage.discardChunkedReplayDraftV2(
      contenderB.generation);
    const final=await storage.getPublishedChunkedReplayV2(archive.id);
    return {
      atomicFailure:failedAtomic,
      stagedFramesAtFailure:interrupted.find(x=>
        x.generation===draft.generation)?.writtenFrames,
      oldVisibleBeforeCommit:stillPublished?.generation===previous.generation,
      replacementChanged:published.generation!==previous.generation,
      raceRejected,discarded,
      finalStillWinner:final?.generation===winner.generation,
      pendingRace:pendingRace.some(x=>
        x.generation===contenderB.generation)
    };
  });
  check(replaced.atomicFailure&&replaced.stagedFramesAtFailure===3&&
    replaced.oldVisibleBeforeCommit&&replaced.replacementChanged&&
    replaced.raceRejected&&replaced.discarded&&replaced.finalStillWinner&&
    replaced.pendingRace,
    'Chunk transaction, replacement or race guard broken: '+
    JSON.stringify(replaced));
  const corruption=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const final=await storage.getPublishedChunkedReplayV2('g3-browser-001');
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('fieldwork-breach-replay-chunks',1);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('chunks','readwrite');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
      tx.objectStore('chunks').delete([final.generation,1]);
    });
    db.close();
    const open=await storage.openChunkedReplayV2('g3-browser-001');
    let missingRejected=false;
    try{await open.window.surrounding(.45);}
    catch(e){missingRejected=/missing|malformed|incomplete/i.test(String(e));}
    const legacy=await loadSavedReplay('g3-browser-001');
    return {missingRejected,legacyFrames:legacy.frames.length};
  });
  check(corruption.missingRejected&&corruption.legacyFrames===8,
    'Corrupt V2 chunk must fail closed without damaging legacy replay: '+
    JSON.stringify(corruption));
  check(!errors.length,'Browser page errors: '+errors.join(' | '));
  console.log('Replay G3 real IndexedDB transactions PASS',JSON.stringify({
    staged:staged.frameCount,restored:completed.count,
    boundarySeek:completed.sample,
    replacement:replaced,corruption
  }));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
