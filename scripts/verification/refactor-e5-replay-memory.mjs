/** E5.0/1: controlled synthetic 20Hz replay film retention study.
 * Compares original clone-then-share capture with pre-clone value reuse.
 * No game motor executes; never infer phone FPS or measured GC pause times.
 * Run: node --experimental-strip-types scripts/verification/refactor-e5-replay-memory.mjs --out artifacts/refactor-e5/memory.json
 */
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {newSession} from '../../src/breach-game.ts';
import {snapshot} from '../../src/breach-replay.ts';
import {shareUnchangedReplayFrame,REPLAY_FULL_KEYFRAME_INTERVAL}
 from '../../src/breach-replay-sharing.ts';

const effectKeys=['doors','shots','casings','dropped','impactMarks',
 'grenades','flashBursts','civilianHarmEvents'];
function preparedSession(){
 const s=newSession(0,17,'true-blind','small');
 for(let i=0;i<16;i++){
  s.shots.push({id:1000+i,start:{x:i,y:i+2},
   end:{x:i+75,y:i+30},age:i*.015,duration:1});
  s.casings.push({id:i,p:{x:i*2,y:i},age:i*.02});
  s.impactMarks.push({id:i,p:{x:i*3,y:i*2},age:i*.04});
 }
 for(let i=0;i<8;i++)
  s.dropped.push({id:'d'+i,p:{x:i,y:i*5},rounds:12});
 return s;
}
function captureSeries(frames,earlyReuse){
 const s=preparedSession(),records=[];
 let avoidedArrays=0,avoidedValueObjects=0;
 let heapStart=process.memoryUsage().heapUsed;
 const started=performance.now();
 const digester=createHash('sha256');
 for(let n=0;n<frames;n++){
  s.seconds=n*.051;
  // Same deterministic in-place edits in both variants: the optimization
  // must detect changes without trusting a source object or array identity.
  if(n&&n%19===0&&s.doors.length)
   s.doors[0].open=!s.doors[0].open;
  if(n&&n%11===0)s.shots[0].age+=.1;
  if(n&&n%37===0)s.impactMarks[0].p.x+=1;
  const previous=records.at(-1);
  const independent=n%REPLAY_FULL_KEYFRAME_INTERVAL===0;
  const frame=snapshot(s,undefined,undefined,new Set(),new Map(),
   undefined,earlyReuse&&!independent?previous:undefined);
  // Independent full keyframes, otherwise the same sharing policy used in
  // production. Snapshot() itself creates no archived global state.
  for(const key of effectKeys)
   if(previous&&frame[key]===previous[key]){
    avoidedArrays++;
    avoidedValueObjects+=frame[key].length;
   }
  shareUnchangedReplayFrame(previous,frame,n);
  records.push(frame);
  digester.update(JSON.stringify({
   t:frame.t,door:frame.doors.map(d=>[d.id,d.open,d.openFraction]),
   shots:frame.shots.map(x=>[x.id,x.start.x,x.age]),
   effects:frame.impactMarks.map(x=>[x.id,x.p.x]),
   c:frame.casings.length,drop:frame.dropped.length,
   ground:frame.seenGround.length
  }));
 }
 const end=performance.now();
 const elapsedNodeMs=Math.round((end-started)*100)/100;
 return {frames:records.length,digest:digester.digest('hex'),
  avoidedArrays,avoidedValueObjects,
  elapsedNodeMs,heapDeltaBytes:process.memoryUsage().heapUsed-heapStart,
  retainedEffectArrayReferences:new Set(records.flatMap(f=>
   effectKeys.map(key=>f[key]))).size};
}
export function runE5MemoryStudy({frames=120}={}){
 const baseline=captureSeries(frames,false);
 const optimized=captureSeries(frames,true);
 if(baseline.digest!==optimized.digest)
  throw Error('E5 replay effect timeline diverged from clone-then-share baseline');
 if(optimized.avoidedArrays<=baseline.avoidedArrays)
  throw Error('E5 expected early capture reuse of unchanged arrays');
 if(optimized.retainedEffectArrayReferences!==
    baseline.retainedEffectArrayReferences)
  throw Error('E5 retained film sharing changed');
 return {stage:'E5.0-E5.1',frames,baseline,optimized,
  sameHistoricalFingerprint:true,
  interpretation:'avoidedValueObjects counts avoided *temporary clone allocations*, not retained heap objects',
  caveat:'Node wall time/heap delta are observational and affected by GC, JIT and prior tests; not mobile FPS or measured GC pauses'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const count=Number(process.argv[process.argv.indexOf('--frames')+1]);
 const result=runE5MemoryStudy({frames:Number.isFinite(count)&&count>0?count:120});
 const outputIndex=process.argv.indexOf('--out');
 if(outputIndex>=0){
  const path=resolve(process.argv[outputIndex+1]);
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+'\n');
 }
 console.log('E5_MEMORY',JSON.stringify(result));
}
