/** D0: repeatable CPU-only full session-stage workloads and exact gameplay
 * fingerprints. Node timings are NOT browser RAF, GPU ms, or iPhone FPS.
 *
 * Run: node --experimental-strip-types scripts/audit-release-d0-workloads.mjs [output.json]
 */
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {newSession,team,enemies,planMove,planMoveStroke,stepSession,toggling}
 from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';

const missions=['clear','hold','intel','rescue','capture'];
// Extended opt-in: two minutes of fixed 60Hz execution per selected
// workload; never invoked by the app's main thread or normal CI.
const sustained=process.argv.includes('--sustained');
const outputPath=process.argv.slice(2).find(arg=>arg!=='--sustained');
const round=n=>Number.isFinite(n)?Math.round(n*10000)/10000:null;
const quantile=(sorted,p)=>sorted.length?
 round(sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]):0;
const stats=(samples)=>{
 const sorted=[...samples].sort((a,b)=>a-b);
 return {count:samples.length,p50:quantile(sorted,.50),p95:quantile(sorted,.95),
  p99:quantile(sorted,.99),max:quantile(sorted,1),
  mean:round(samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length))};
};
const digest=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
function stateTruth(s,recorder,accepted){
 const pos=p=>p?{x:round(p.x),y:round(p.y)}:null;
 return {seed:s.site?.seed??0,mission:s.missionType,phase:s.phase,
  status:s.mission,seconds:round(s.seconds),accepted,shots:s.nextShotId,
  objectRevision:s.objectRevision,seenGround:s.seenGround.size,
  events:s.battleEvents.map(e=>[e.id,e.kind,round(e.t)]),
  executionEvents:s.executionEvents.map(e=>[e.id,e.kind,round(e.t)]),
  ops:s.operators.map(a=>[a.id,a.side,pos(a.p),round(a.heading),
   a.health,a.injuryStage,a.alert,a.plan.length,a.surrendered]),
  civilians:s.civilians.map(c=>[c.id,pos(c.p),c.health,c.state,
   c.carriedById,c.rescueTarget]),
  doors:s.doors.map(d=>[d.id,d.open,round(d.openFraction??(d.open?1:0))]),
  objective:pos(s.scenario.objective),extract:pos(s.scenario.extract),
  replay:{samples:recorder.frames.length,
   duration:round(recorder.duration),events:recorder.events.length,
   steps:recorder.motion.stepEventCount,complete:recorder.completeness.complete}
 };
}
function run({label,seed,mission,scale='small',ticks=180,
 civilians=false,movement=false,contact=false}){
 const beforeMemory=process.memoryUsage().heapUsed;
 const creationAt=performance.now();
 // Same operation, map and roster are used for both before/after checks.
 const s=newSession(0,seed,'floor-plan',scale,mission,undefined,
  {enableCivilians:civilians});
 const creationMs=performance.now()-creationAt;
 const film=new MissionRecorder();
 let accepted=0;
 try{
  if(contact){
   const blues=team(s),reds=enemies(s);
   for(let i=0;i<blues.length;i++){
    const a=blues[i];a.p={x:185,y:612+i*24};a.priorP={...a.p};
    a.heading=0;a.weaponYaw=0;a.health=99;a.firePolicy='engage';
    a.stability=1;a.weapon='smg';a.magazine=60;a.reserve=180;
   }
   for(let i=0;i<reds.length;i++){
    const a=reds[i];a.p={x:315,y:612+i*24};a.priorP={...a.p};
    a.heading=Math.PI;a.weaponYaw=Math.PI;a.health=99;
    a.stability=1;a.weapon='smg';a.magazine=60;a.reserve=180;
    a.contacted=true;a.alert='engaging';a.contact={...blues[0].p};
   }
   for(const a of s.operators)for(const b of s.operators)
    if(a.side!==b.side)a.awareness.visualProgress[b.id]=1;
  }
  if(movement){
   const waypoint=s.site?.objective??s.scenario.objective;
   const entry=s.site?.entrance??s.scenario.objective;
   for(const actor of team(s).slice(0,4)){
    if(planMoveStroke(s,actor.id,[entry,waypoint],false,true)||
       planMove(s,actor.id,entry))accepted++;
   }
  }
  film.capture(s,true);
  toggling(s);
  const times=[],recordTimes=[];
  const phaseTotal=new Map(),slowTicks=[];
  const heapSamples=[beforeMemory];
  let steps=0;
  for(let tick=0;tick<ticks&&s.phase==='running';tick++){
   const started=performance.now();
   stepSession(s,1/60,(name,ms)=>{
    if(!name.includes('/')&&!name.startsWith('operator-'))
      phaseTotal.set(name,(phaseTotal.get(name)??0)+ms);
   });
   const elapsed=performance.now()-started;
   times.push(elapsed);
   if(elapsed>=33.3&&slowTicks.length<8)slowTicks.push(tick);
   const recordAt=performance.now();
   film.capture(s,s.phase!=='running');
   recordTimes.push(performance.now()-recordAt);
   steps++;
   // Low-frequency Node-only heap observations, not browser allocations
   // or evidence of retained memory without a controlled GC experiment.
   if(steps%60===0)heapSamples.push(process.memoryUsage().heapUsed);
  }
  film.capture(s,true);
  const truth=stateTruth(s,film,accepted);
  const replayTimes=[];
  // Read-only timeline seeks; never mutate live session or advance clocks.
  for(let j=0;j<120;j++){
   const at=film.duration*j/119;
   const start=performance.now();
   const frame=film.surrounding(at);
   if(!frame)throw Error('Missing replay sample '+label);
   replayTimes.push(performance.now()-start);
  }
  const combined=Object.fromEntries([...phaseTotal].sort((a,b)=>b[1]-a[1])
    .slice(0,10).map(([key,value])=>[key,round(value)]));
  if(!truth.ops.every(a=>a[2]&&Number.isFinite(a[2].x)&&
       Number.isFinite(a[2].y)))throw Error('Nonfinite body '+label);
  return {label,seed,mission,scale,requestedTicks:ticks,ticks:steps,
   accepted,hostiles:enemies(s).length,civilianActors:s.civilians.length,
   timing:{creationMs:round(creationMs),simulation:stats(times),
    recording:stats(recordTimes),replaySeek:stats(replayTimes),
    phaseCpuTotalMs:combined,
    heapDeltaBytes:process.memoryUsage().heapUsed-beforeMemory,
    heapSamplesEvery60Ticks:{first:heapSamples[0],
      last:heapSamples.at(-1),peak:Math.max(...heapSamples),
      observations:heapSamples.length},
    slowTickIndices:slowTicks},
   fingerprint:digest(truth),
   truth};
 }finally{activateSite(null);}
}
const specs=[
 {label:'planning-to-live-quiet',seed:11,mission:'clear',ticks:180},
 {label:'four-operator-movement',seed:17,mission:'intel',movement:true,ticks:240},
 {label:'active-contact-firefight',seed:3,mission:'clear',contact:true,ticks:180},
 {label:'populated-civilian-response',seed:28,mission:'hold',civilians:true,ticks:210},
 {label:'expanded-world-and-replay',seed:17,mission:'rescue',scale:'expanded',ticks:150},
 // Explicitly exercise every operation with its real encounter/objective.
 ...missions.map((mission,i)=>({label:'mission-'+mission,seed:31+i,mission,ticks:120}))
];
// The normal CI suite compares all ten short deterministic workloads.
// Sustained runs are local/manual and intentionally keep the smaller three
// hot cases, to capture allocation drift without ten repeated map builds.
const chosen=sustained?specs.filter(s=>[
 'planning-to-live-quiet','active-contact-firefight',
 'populated-civilian-response'].includes(s.label))
 .map(s=>({...s,ticks:7200})):specs;
const workloads=chosen.map(run);
const summary={version:1,sustained,workloads:workloads.length,
 modes:[...new Set(workloads.map(w=>w.label))],
 missionKinds:missions,
 totalTicks:workloads.reduce((n,w)=>n+w.ticks,0),
 nonfinite:0,
 completed:workloads.filter(w=>w.truth.phase==='won').length,
 benchmarkPlatform:'Node CPU + heap estimates only; NOT GPU/RAF/iPhone'};
const result={summary,workloads};
console.log('D0 WORKLOAD SUMMARY',JSON.stringify(summary));
for(const row of workloads)console.log('D0 WORKLOAD',
 JSON.stringify({label:row.label,ticks:row.ticks,fingerprint:row.fingerprint,
  sim:row.timing.simulation,record:row.timing.recording,
  seeks:row.timing.replaySeek,hot:row.timing.phaseCpuTotalMs}));
if(outputPath)writeFileSync(outputPath,
 JSON.stringify(result,null,2)+'\n');
if((!sustained&&(workloads.length!==10||summary.totalTicks<900))||
   (sustained&&workloads.length!==3))process.exitCode=1;
