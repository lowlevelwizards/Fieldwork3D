/** E4.I: observational long-round replay closeout.
 * This is a deterministic integrity + allocation-count workload, NOT a
 * browser FPS, GC latency, WebGL cost or phone-memory benchmark.
 * Run: node --experimental-strip-types scripts/verification/refactor-e4-closeout.mjs
 */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ReplayMotionRecorder} from '../../src/breach-replay-motion.ts';
import {ReplayMovementHistory} from '../../src/breach-replay-movement-history.ts';
import {ReplayEventIndex} from '../../src/breach-replay-event-index.ts';
import {replayFeedPosition} from '../../src/breach-replay-feed-window.ts';
import {ReplayFeedFilterCache,ReplayFeedDomWindow}
 from '../../src/ui/breach-replay-feed-dom.ts';

const motionFoot=(at,x)=>({at,from:{x,y:0},to:{x,y:0},
 fromYaw:0,toYaw:0,unload:0,swing:0,lift:0,landing:0,recovery:0});
const ids=['rook','moss','ash','vale'];
function motionFilm(){
 const accel=Array.from({length:1800},(_,i)=>({at:i/60,
  acceleration:i%10<5?185:-190}));
 return {schemaVersion:1,actors:ids.map((id,j)=>({
  id,feet:[[motionFoot(0,j*8)],[motionFoot(0,j*8+2)]],
  travelYaw:j*.15,
  travelYawEvents:[{at:0,yaw:0},{at:15,yaw:j*.15}],
  pelvisYawEvents:[{at:0,yaw:0},{at:15,yaw:j*.15}],
  accelEvents:accel.map(e=>({...e}))
 })),doors:[{id:'door-a',events:[
  {at:0,fraction:0},{at:5,fraction:1},{at:20,fraction:0}]}]};
}
function fakeFeed(){
 const ownerDocument={activeElement:null};
 const container={ownerDocument,children:[],replacements:0,
  replaceChildren(...nodes){this.children=nodes;this.replacements++;}};
 let created=0;
 const make=event=>{
  created++;
  return {event,classList:{toggle(){}},focus(){ownerDocument.activeElement=this;}};
 };
 return {container,make,get created(){return created;}};
}
export function runE4Closeout(){
 const started=performance.now(),frames=1800;
 const replayFrames=Array.from({length:frames},(_,i)=>({
  t:i/60,actors:ids.map((id,j)=>({id,p:{x:i*4+j*7,y:j*30+i%3*5},
   pace:'walk',posture:'stand'}))
 }));
 const history=new ReplayMovementHistory(replayFrames,ids);
 const motion=new ReplayMotionRecorder(),archive=motionFilm();
 const archiveBefore=structuredClone(archive);
 motion.loadArchive(archive);
 const before=motion.toArchive();
 const battle=Array.from({length:1400},(_,i)=>({
  id:i+1,t:i/60,kind:i%5===0?'shot':i%5===1?'wound':
    i%5===2?'door':i%5===3?'intel':'objective',
  actor:ids[i%ids.length],text:'Recorded '+i
 }));
 const execution=Array.from({length:300},(_,i)=>({
  id:3000+i,t:i/12,kind:i%3===0?'blocked':
   i%3===1?'resumed':'completed',actor:ids[i%4],text:'Order '+i
 }));
 const eventEvidence=structuredClone({battle,execution});
 const index=new ReplayEventIndex(battle,execution);
 const filter=new ReplayFeedFilterCache();
 const feedEvents=filter.get(index.all,'combat',{
  combat:['shot','wound'],all:[]
 });
 const f=fakeFeed(),feed=new ReplayFeedDomWindow(f.container);
 const totalChecks=480;
 let sampledTrailPoints=0,motionSamples=0;
 for(let i=0;i<totalChecks;i++){
  const t=12+i/60;
  const presentation=motion.presentation(t,ids,true);
  assert.equal(Object.keys(presentation.momentum).length,4);
  assert.equal(Object.keys(presentation.doors).length,1);
  motionSamples+=Object.keys(presentation.feet).length;
  const point=history.segment('rook',t,15,350);
  assert.ok(point.every(p=>p.t<=t),
   'recorded path must not reveal future actor positions');
  sampledTrailPoints+=point.length;
  const latest=index.latest(t+.14);
  assert.ok(!latest||!(latest.t>t+.14),
   'HUD latest must not leak future events');
  index.next(t);index.previous(t);
  const position=replayFeedPosition(feedEvents,t);
  feed.render(feedEvents,position.start,position.end,
   feedEvents[position.focusIndex]?.key??null,f.make);
  assert.strictEqual(filter.get(index.all,'combat',
   {combat:['shot','wound'],all:[]}),feedEvents);
 }
 assert.deepEqual(motion.toArchive(),before,
  'motion film must remain immutable under normal playback');
 assert.deepEqual(archive,archiveBefore,
  'archive input may never be mutated by the renderer');
 assert.deepEqual({battle,execution},eventEvidence,
  'HUD indexing and filtering cannot mutate historical evidence');
 assert.ok(feed.renderedCount<=80,
  'the retained DOM event viewport must stay bounded');
 assert.ok(f.created<=80+totalChecks,
  'adjacent playback must reuse overlapping feed nodes');
 const second=new ReplayMotionRecorder();
 second.loadArchive(archive);
 const same=second.presentation(13.15,ids,true);
 assert.deepEqual(motion.presentation(13.15,ids,true),same,
  'a new archive session must not inherit another cursor or pose');
 filter.clear();feed.clear();
 assert.equal(feed.renderedCount,0,'closeout must release retained DOM nodes');
 const report={
  stage:'E4.I',kind:'deterministic-node-observational',
  actors:ids.length,frames,events:battle.length+execution.length,
  replaySteps:totalChecks,motionSamples,sampledTrailPoints,
  feedButtonsCreated:f.created,feedWindowReplacements:f.container.replacements,
  retainedFeedNodesAfterReset:feed.renderedCount,
  archivesUnchanged:true,eventEvidenceUnchanged:true,
  elapsedNodeMs:Math.round((performance.now()-started)*100)/100,
  caveat:'Node wall time is observational; no mobile FPS, GPU time or GC-latency claim'
 };
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const report=runE4Closeout();
 const outIndex=process.argv.indexOf('--out');
 if(outIndex>=0){
  const output=resolve(process.argv[outIndex+1]);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 }
 console.log('E4_CLOSEOUT',JSON.stringify(report));
}
