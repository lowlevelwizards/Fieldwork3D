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
    archive.battleEvents.push(
      {id:8001,t:.2,kind:'door',actor:'rook',
        text:'ROOK OPENED DOOR',p:{x:120,y:180}},
      {id:8002,t:.4,kind:'door',actor:'moss',
        text:'MOSS OPENED DOOR',p:{x:125,y:190}}
    );
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
    // G4b — open a real V2 publication through the async transport.
    // No full-frame reconstruction and no live MissionRecorder required.
    const {openReplayChunkTransportV2}=await import(
      '/src/breach-replay-chunk-transport.ts');
    const playback=await openReplayChunkTransportV2('g3-browser-001');
    const firstSeek=await playback.seek(.25);
    const forward=await playback.advance(.2,1);
    const rewind=await playback.advance(.1,-1);
    const transport={
      firstStatus:firstSeek.status,
      firstAlpha:firstSeek.sample?.alpha,
      forwardAt:forward.sample?.t,
      rewindAt:rewind.sample?.t,
      lastPrevious:rewind.sample?.previous.t,
      lastNext:rewind.sample?.next.t,
      resident:playback.residentChunks,
      recordingComplete:playback.recordingComplete
    };
    playback.close();
    transport.closed=playback.status==='closed';
    // G4c3: hydrate a separate replay-only Session using the actual
    // historical renderer frame source; no game tick, AI or extra sight.
    const {openReplayChunkSceneV2}=await import(
      '/src/breach-replay-chunk-scene.ts');
    const {restoreReplayArchive}=await import(
      '/src/breach-replay-archive.ts');
    const {newSession}=await import('/src/breach-game.ts');
    const scene=await openReplayChunkSceneV2('g3-browser-001');
    const observer=await scene.seek(.25);
    const v1=await loadSavedReplay('g3-browser-001');
    const legacy=restoreReplayArchive(v1).sample(.25);
    const ownedFrame=observer.status==='ready'?observer.value:null;
    const matched=JSON.stringify(ownedFrame?.frame)===
      JSON.stringify(legacy);
    const presentation=ownedFrame?.frame.presentation;
    const historicalVisibility=ownedFrame?.frame.knowledge;
    const stage=newSession(0,3948);
    if(ownedFrame)scene.applyToReplaySession(stage,ownedFrame);
    const hydration=ownedFrame?{
      matched,actorPosition:stage.operators[0]?.p,
      originalPosition:legacy.actors[0]?.p,
      sceneTime:stage.seconds,filmTime:ownedFrame.frame.t,
      sceneDoors:stage.doors.length,filmDoors:ownedFrame.frame.doors.length,
      motionFeet:Object.keys(presentation?.feet??{}).length,
      personalObservation:historicalVisibility?.operatorVisibleActorIds?
        Object.hasOwn(historicalVisibility.operatorVisibleActorIds,'rook'):
        false,
      phantomObserver:scene.recordedObserverKnowledge('phantom')===null,
      resident:scene.residentChunks,
      worldWindows:stage.windows.length
    }:null;
    const earlier=await scene.seek(.03);
    let staleRejected=false;
    if(ownedFrame){
      try{scene.applyToReplaySession(stage,ownedFrame);}
      catch{staleRejected=true;}
    }
    const sceneRewind=earlier.status==='ready'?earlier.value.frame.t:null;
    scene.close();
    // G4d2: the browser's persisted film now drives the exact playback
    // controller used by a future tactical/Bodycam UI, without a full film.
    const {ReplayChunkPlaybackController}=await import(
      '/src/breach-replay-chunk-controller.ts');
    const driverScene=await openReplayChunkSceneV2('g3-browser-001');
    const driverSession=newSession(0,3948);
    const driver=new ReplayChunkPlaybackController(driverScene,driverSession);
    const initial=await driver.seek(.13);
    const initialMatches=JSON.stringify(driver.frame?.frame)===
      JSON.stringify(restoreReplayArchive(v1).sample(.13));
    driver.setRate(2);
    const accepted=driver.play();
    const stepped=await driver.tick(.1);
    const afterTick=driverSession.seconds;
    const matchedAfter=JSON.stringify(driver.frame?.frame)===
      JSON.stringify(restoreReplayArchive(v1).sample(.33));
    driver.pause();
    const pausedAt=driver.time;
    const idle=await driver.tick(1);
    const rewindResult=await driver.seek(.17);
    const silentlyRewound=rewindResult.candidateSounds.length===0;
    const afterRewind=driverSession.seconds;
    const oldMissionStillIntact=(await loadSavedReplay('g3-browser-001'))
      .frames.length===8;
    const maxResident=driver.residentChunks;
    driver.close();
    const controlled={
      initial:initial.status,initialMatches,accepted,
      stepped:stepped.status,tickTime:afterTick,matchedAfter,
      pausedAt,idle:idle.status,rewind:rewindResult.status,
      afterRewind,silentlyRewound,oldMissionStillIntact,maxResident,
      closed:driver.status==='closed'
    };
    // G4d4: historical event-feed disclosure uses a separate read window.
    // Even while the player seeks their film, building an operator rail must
    // not advance the active camera or grant the teammate's discoveries.
    const {openChunkedReplayEventIndexV2}=await import(
      '/src/breach-replay-chunk-event-index.ts');
    const eventReader=await openChunkedReplayEventIndexV2('g3-browser-001');
    const personalEvents=await eventReader.build(
      {mode:'operator',observerId:'rook'},['rook','moss']);
    const ownNames=personalEvents.status==='ready'?
      personalEvents.index.all.map(e=>e.text):[];
    const teamEvents=await eventReader.build({mode:'squad'},['rook','moss']);
    const teamNames=teamEvents.status==='ready'?
      teamEvents.index.all.map(e=>e.text):[];
    const fullEvents=await eventReader.build({mode:'full'},['rook','moss']);
    const disclosure={
      ownNames,teamNames,
      all:fullEvents.status==='ready'?fullEvents.index.all.length:-1,
      cached:eventReader.residentChunks
    };
    eventReader.close();
    const pendingAfter=await storage.listInterruptedChunkedReplaysV2();
    return {generation:release.generation,
      count:release.frameCount,storageComplete:release.storageComplete,
      sidecarEvidence:release.sidecar.optionalEvidence?.personalWindows?.[0]?.state,
      sourceSeed:release.sidecar.manifest.site.seed,
      sample:{previous:sample?.previous.t,next:sample?.next.t,
        alpha:sample?.alpha},
      resident:opened.window.residentCount,
      transport,
      hydration,staleRejected,sceneRewind,controlled,disclosure,
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
  check(completed.transport.firstStatus==='ready'&&
    Math.abs(completed.transport.firstAlpha-.5)<1e-8&&
    Math.abs(completed.transport.forwardAt-.45)<1e-8&&
    Math.abs(completed.transport.rewindAt-.35)<1e-8&&
    completed.transport.lastPrevious<.35&&
    completed.transport.lastNext>.35&&
    completed.transport.resident<=3&&
    completed.transport.recordingComplete&&completed.transport.closed,
    'G4 async playback was not faithful after browser reload: '+
    JSON.stringify(completed.transport));
  check(completed.hydration?.matched&&
    Math.abs(completed.hydration.sceneTime-.25)<1e-8&&
    completed.hydration.sceneTime===completed.hydration.filmTime&&
    JSON.stringify(completed.hydration.actorPosition)===
      JSON.stringify(completed.hydration.originalPosition)&&
    completed.hydration.sceneDoors===completed.hydration.filmDoors&&
    completed.hydration.motionFeet>=1&&
    completed.hydration.personalObservation&&
    completed.hydration.phantomObserver&&
    completed.hydration.resident<=3&&
    completed.staleRejected&&
    Math.abs(completed.sceneRewind-.03)<1e-8,
    'G4c3 replay scene failed actual browser V2 history parity: '+
    JSON.stringify(completed.hydration));
  check(completed.controlled.initial==='ready'&&
    completed.controlled.initialMatches&&
    completed.controlled.accepted&&
    completed.controlled.stepped==='ready'&&
    Math.abs(completed.controlled.tickTime-.33)<1e-8&&
    completed.controlled.matchedAfter&&
    Math.abs(completed.controlled.pausedAt-.33)<1e-8&&
    completed.controlled.idle==='idle'&&
    completed.controlled.rewind==='ready'&&
    Math.abs(completed.controlled.afterRewind-.17)<1e-8&&
    completed.controlled.silentlyRewound&&
    completed.controlled.oldMissionStillIntact&&
    completed.controlled.maxResident<=3&&completed.controlled.closed,
    'G4d2 persisted controller failed browser playback, pause and scrub: '+
    JSON.stringify(completed.controlled));
  check(JSON.stringify(completed.disclosure?.ownNames)===
      JSON.stringify(['ROOK OPENED DOOR'])&&
    JSON.stringify(completed.disclosure?.teamNames)===
      JSON.stringify(['ROOK OPENED DOOR','MOSS OPENED DOOR'])&&
    completed.disclosure?.all===2&&
    completed.disclosure?.cached<=3,
    'G4d4 Chromium event disclosure mixed personal/team journals: '+
    JSON.stringify(completed.disclosure));
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
      const request=indexedDB.open('fieldwork-breach-replay-chunks',2);
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
  // G5b2: unknown-length persisted recording is intentionally interrupted
  // after one chunk, then reopened and published after a complete sidecar.
  const streamPartial=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const archive=await loadSavedReplay('g3-browser-001');
    const draft=await storage.beginStreamingReplayV2(
      'g5-stream-001',archive.createdAt,{chunkFrames:3});
    await storage.appendStreamingReplayChunkV2(draft.generation,0,
      archive.frames.slice(0,3));
    let earlyRejected=false;
    try{await storage.commitStreamingReplayV2(draft.generation,{
      ...archive,id:'g5-stream-001',frames:undefined
    });}catch(e){earlyRejected=String(e).includes('incomplete');}
    const published=await storage.getPublishedChunkedReplayV2('g5-stream-001');
    const pending=await storage.listInterruptedStreamingReplaysV2();
    return {generation:draft.generation,earlyRejected,
      hidden:published===null,pending:pending.find(x=>
        x.generation===draft.generation)};
  });
  check(streamPartial.earlyRejected&&streamPartial.hidden&&
    streamPartial.pending?.writtenFrames===3&&
    streamPartial.pending?.sealed===false,
    'Streaming draft was prematurely published: '+
    JSON.stringify(streamPartial));
  await page.reload({waitUntil:'domcontentloaded'});
  const streamed=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const archive=await loadSavedReplay('g3-browser-001');
    const {frames,...base}=archive;
    const sidecar={...base,id:'g5-stream-001'};
    const drafts=await storage.listInterruptedStreamingReplaysV2();
    const draft=drafts.find(x=>x.id===sidecar.id);
    if(!draft||draft.writtenFrames!==3)
      throw Error('Stream draft missing after browser reload');
    await storage.appendStreamingReplayChunkV2(draft.generation,1,
      frames.slice(3,6));
    await storage.appendStreamingReplayChunkV2(draft.generation,2,
      frames.slice(6,8),true);
    let badRejected=false;
    try{await storage.commitStreamingReplayV2(draft.generation,{
      ...sidecar,personalGround:[{at:99999,observerId:'rook',
        keys:['fine:0,0']}]
    });}catch(e){badRejected=String(e).includes('invalid');}
    const unreleased=await storage.getPublishedChunkedReplayV2(sidecar.id);
    const published=await storage.commitStreamingReplayV2(
      draft.generation,sidecar);
    const reopened=await storage.openChunkedReplayV2(sidecar.id);
    const span=await reopened.window.surrounding(.25);
    const left=span?.previous?.t,right=span?.next?.t;
    const remaining=await storage.listInterruptedStreamingReplaysV2();
    // A new version that fails/is explicitly discarded must not delete
    // or corrupt the already published historical evidence.
    const replacement=await storage.beginStreamingReplayV2(sidecar.id,
      sidecar.createdAt,{replace:true,chunkFrames:3});
    await storage.appendStreamingReplayChunkV2(
      replacement.generation,0,frames.slice(0,3));
    const beforeDiscard=await storage.getPublishedChunkedReplayV2(sidecar.id);
    const discarded=await storage.discardStreamingReplayV2(
      replacement.generation);
    const afterDiscard=await storage.getPublishedChunkedReplayV2(sidecar.id);
    // An exact multiple of the chunk length seals without inventing a
    // zero-frame final chunk, and is then readable by the same G4 reader.
    const fullId='g5-stream-full-001';
    const full=await storage.beginStreamingReplayV2(
      fullId,sidecar.createdAt,{chunkFrames:3});
    await storage.appendStreamingReplayChunkV2(
      full.generation,0,frames.slice(0,3));
    await storage.appendStreamingReplayChunkV2(
      full.generation,1,frames.slice(3,6));
    const sealed=await storage.sealStreamingReplayV2(full.generation);
    const fullPublished=await storage.commitStreamingReplayV2(
      full.generation,{...sidecar,id:fullId});
    const fullReader=await storage.openChunkedReplayV2(fullId);
    return {badRejected,unreleased:unreleased===null,
      count:published.frameCount,complete:published.storageComplete,
      generation:published.generation,from:left,to:right,
      cache:reopened.window.residentCount,remaining:remaining.length,
      keptBefore:beforeDiscard?.generation===published.generation,
      discarded,keptAfter:afterDiscard?.generation===published.generation,
      fullSealed:sealed.sealed,fullCount:fullPublished.frameCount,
      fullWindow:fullReader.window.totalFrames,
      legacyFrames:archive.frames.length};
  });
  check(streamed.badRejected&&streamed.unreleased&&
    streamed.count===8&&streamed.complete&&
    streamed.from<.25&&streamed.to>.25&&streamed.cache<=3&&
    streamed.remaining===0&&streamed.keptBefore&&
    streamed.discarded&&streamed.keptAfter&&
    streamed.fullSealed&&streamed.fullCount===6&&
    streamed.fullWindow===6&&streamed.legacyFrames===8,
    'G5b2 IndexedDB stream durability, finalization or recovery broken: '+
    JSON.stringify(streamed));
  // G5b4: complete 20 Hz sample capture -> bounded spool -> versioned
  // IndexedDB chunk transactions -> same bounded playback reader.
  const spooled=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {ReplayChunkCaptureSpool}=await import(
      '/src/breach-replay-chunk-spool.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const archive=await loadSavedReplay('g3-browser-001');
    const {frames,...original}=archive;
    const id='g5-spooled-001';
    const draft=await storage.beginStreamingReplayV2(id,archive.createdAt,
      {chunkFrames:3});
    const spool=new ReplayChunkCaptureSpool(
      (index,chunk,final)=>storage.appendStreamingReplayChunkV2(
        draft.generation,index,chunk,final).then(()=>{}),
      {chunkFrames:3,maxQueuedChunks:2});
    const accepted=frames.every(frame=>spool.append(frame));
    const finished=await spool.finish();
    const sealed=await storage.sealStreamingReplayV2(draft.generation);
    const saved=await storage.commitStreamingReplayV2(
      draft.generation,{...original,id});
    const reader=await storage.openChunkedReplayV2(id);
    const span=await reader.window.surrounding(.25);
    const {openReplayChunkSceneV2}=await import(
      '/src/breach-replay-chunk-scene.ts');
    const scene=await openReplayChunkSceneV2(id);
    const viewed=await scene.seek(.25);
    const viewMatches=viewed.status==='ready'&&
      JSON.stringify(viewed.value.frame.knowledge)===
        JSON.stringify(frames[2].knowledge);
    scene.close();
    const old=await loadSavedReplay('g3-browser-001');
    return {accepted,completed:finished.recordingComplete,
      count:finished.persistedFrames,chunks:finished.chunks,
      sealed:sealed.sealed,stored:saved.frameCount,
      diskComplete:saved.storageComplete,
      first:span?.previous.t,last:span?.next.t,
      resident:reader.window.residentCount,
      viewMatches,unchangedLegacy:old.frames.length===8};
  });
  check(spooled.accepted&&spooled.completed&&spooled.count===8&&
    spooled.chunks===3&&spooled.sealed&&spooled.stored===8&&
    spooled.diskComplete&&spooled.first<.25&&
    spooled.last>.25&&spooled.resident<=3&&
    spooled.viewMatches&&spooled.unchangedLegacy,
    'G5b4 bounded producer→IDB→consumer integration broke: '+
    JSON.stringify(spooled));
  // G5c2: actual 60 Hz mission motor -> native MissionRecorder.capture
  // -> synchronous 20 Hz observer -> bounded spool -> atomic IndexedDB ->
  // published historical scene. No synthetic replacement of source samples.
  const realCapture=await page.evaluate(async()=>{
    const [{newSession,toggling,stepSession},
      {MissionRecorder},{ReplayLiveCaptureTap},
      {ReplayChunkCaptureSpool},storage,{captureReplayArchive}]=
      await Promise.all([
        import('/src/breach-game.ts'),
        import('/src/breach-replay.ts'),
        import('/src/breach-replay-live-capture.ts'),
        import('/src/breach-replay-chunk-spool.ts'),
        import('/src/breach-replay-chunk-store.ts'),
        import('/src/breach-replay-archive.ts')
      ]);
    const seed=910,createdAt=1712345678900,id='g5c-actual-motor-001';
    const session=newSession(0,seed),recorded=new MissionRecorder();
    recorded.capture(session,true);
    const draft=await storage.beginStreamingReplayV2(id,createdAt,
      {chunkFrames:6});
    const spool=new ReplayChunkCaptureSpool(
      (index,frames,final)=>storage.appendStreamingReplayChunkV2(
        draft.generation,index,frames,final).then(()=>{}),
      {chunkFrames:6,maxQueuedChunks:2});
    const capture=new ReplayLiveCaptureTap(recorded,spool);
    toggling(session);
    for(let n=0;n<120;n++){
      // Motor provides actual authoritative movement, combat, visibility
      // and 60 Hz motion; recorder itself decides 20 Hz frame cadence.
      if(session.phase!=='running')session.phase='running';
      stepSession(session,1/60);
      recorded.capture(session);
      // Allow real async IDB commits at realistic simulation ticks.
      if(n%6===5)
        await new Promise(resolve=>setTimeout(resolve,0));
    }
    recorded.capture(session,true); // duplicate final time must replace tail
    const finish=await capture.finish();
    const archive=captureReplayArchive(recorded,id,createdAt);
    const {frames,...sidecar}=archive;
    const sealed=await storage.sealStreamingReplayV2(draft.generation);
    const published=await storage.commitStreamingReplayV2(
      draft.generation,sidecar);
    const {openReplayChunkSceneV2}=await import(
      '/src/breach-replay-chunk-scene.ts');
    const scene=await openReplayChunkSceneV2(id);
    const at=Math.min(.82,scene.endTime);
    const read=await scene.seek(at);
    const expected=recorded.sample(at);
    const frameMatches=read.status==='ready'&&
      JSON.stringify(read.value.frame)===JSON.stringify(expected);
    const viewer=newSession(0,seed);
    if(read.status==='ready')
      scene.applyToReplaySession(viewer,read.value);
    const actorMatches=read.status==='ready'&&
      JSON.stringify(viewer.operators.find(x=>x.id==='rook')?.p)===
      JSON.stringify(expected.actors.find(x=>x.id==='rook')?.p);
    const personalKnowledge=read.status==='ready'&&
      !!scene.recordedObserverKnowledge('rook')?.operatorVisibleActorIds?.rook;
    const originalV1Frames=recorded.frames.length;
    scene.close();
    return {frames:originalV1Frames,
      written:finish.persistedFrames,notices:capture.deliveredNotices,
      sourceComplete:finish.sourceComplete,
      streamComplete:finish.recordingComplete,
      diskComplete:published.storageComplete,
      persistedCount:published.frameCount,
      chunkCount:published.boundaries.length,
      sealed:sealed.sealed,
      frameMatches,actorMatches,personalKnowledge,
      motionActors:sidecar.motion.actors.length,
      sidecarEvents:sidecar.battleEvents.length,
      capturedTime:recorded.duration,
      resident:spool.residentFrames,
      persistedResident:published.boundaries.length>0
    };
  });
  check(realCapture.frames>25&&realCapture.frames<65&&
    realCapture.written===realCapture.frames&&
    realCapture.sourceComplete&&realCapture.streamComplete&&
    realCapture.diskComplete&&
    realCapture.persistedCount===realCapture.frames&&
    realCapture.chunkCount>=5&&realCapture.sealed&&
    realCapture.frameMatches&&realCapture.actorMatches&&
    realCapture.personalKnowledge&&realCapture.motionActors>=2&&
    realCapture.capturedTime>=1.9&&realCapture.resident===0,
    'G5c2 REAL 60 Hz motor → 20 Hz film → IDB → replay parity failed: '+
    JSON.stringify(realCapture));
  const corruption=await page.evaluate(async()=>{
    const storage=await import('/src/breach-replay-chunk-store.ts');
    const {loadSavedReplay}=await import('/src/breach-replay-library.ts');
    const final=await storage.getPublishedChunkedReplayV2('g3-browser-001');
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('fieldwork-breach-replay-chunks',2);
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
  console.log('Replay G3/G4d/G5b2 real IndexedDB transactions PASS',JSON.stringify({
    staged:staged.frameCount,restored:completed.count,
    boundarySeek:completed.sample,
    replacement:replaced,corruption
  }));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
