/** Performance P6.C — deterministic JS-only presentation benchmark.
 * No GPU/DOM, no FPS claims, no time threshold. Tests identity and reports
 * median/worst CPU wall time for historical per-actor scans versus one rebuilt
 * frame index under the same shot history and visibility predicate.
 * Usage: node --experimental-strip-types scripts/verification/performance-p6-frame-index-bench.mjs
 */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {RecentMuzzleShotFrameIndex,mostRecentActiveMuzzleShot}
 from '../../src/breach-combat-cues.ts';
import {rebuildFrameIdIndex} from '../../src/breach-frame-lookup.ts';

let seed=608162;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
function measure(run,iterations=35){
 for(let i=0;i<6;i++)run();
 const samples=[];
 for(let i=0;i<iterations;i++){
  const start=performance.now();run();
  samples.push(performance.now()-start);
 }
 return {medianMs:+median(samples).toFixed(3),
  worstMs:+Math.max(...samples).toFixed(3)};
}
const report=[];
for(const actors of [4,16,88])for(const events of [64,512,2048]){
 const roster=Array.from({length:actors},(_,i)=>({id:'actor-'+i}));
 const doors=Array.from({length:Math.min(80,Math.floor(actors*1.2))},
  (_,i)=>({id:'door-'+i}));
 // Majority of the retained history cannot flash, exactly as in a long
 // recorded encounter. Some newer bursts remain eligible and hidden.
 const shots=Array.from({length:events},(_,i)=>({
  id:i,shooterId:roster[Math.floor(rnd()*actors)].id,
  age:i<events-12?.13+rnd()*7:rnd()*.124,
  visible:rnd()>.45
 }));
 const reveal=shot=>shot.visible;
 const indexed=new RecentMuzzleShotFrameIndex();
 const byActor=new Map(),byDoor=new Map();
 const legacy=()=>{
  let checksum=0;
  for(const operator of roster){
   const flash=mostRecentActiveMuzzleShot(shots,operator.id,'carbine',null,reveal);
   if(flash)checksum+=flash.id+1;
   const picked=roster.find(a=>a.id===operator.id);
   const door=doors.find(d=>d.id===doors[operator.id.length%doors.length]?.id);
   if(picked&&door)checksum++;
  }
  return checksum;
 };
 const optimized=()=>{
  let checksum=0;
  indexed.rebuild(shots);
  rebuildFrameIdIndex(byActor,roster);
  rebuildFrameIdIndex(byDoor,doors);
  for(const operator of roster){
   const flash=mostRecentActiveMuzzleShot(indexed.forShooter(operator.id),
    operator.id,'carbine',null,reveal);
   if(flash)checksum+=flash.id+1;
   const picked=byActor.get(operator.id);
   const door=byDoor.get(doors[operator.id.length%doors.length]?.id);
   if(picked&&door)checksum++;
  }
  return checksum;
 };
 assert.equal(optimized(),legacy(),
  'presentation flashes and actor/door ID lookup results must match');
 const old=measure(legacy),fresh=measure(optimized);
 report.push({actors,events,baseline:old,indexed:fresh,
  medianRatio:+(old.medianMs/Math.max(.001,fresh.medianMs)).toFixed(2)});
}
console.log(JSON.stringify({kind:'P6-C JS-only presentation microbench',
 platform:process.platform,node:process.version,
 notMeasured:'WebGL, mobile Safari, gameplay FPS or total frame time',
 runs:report},null,2));
