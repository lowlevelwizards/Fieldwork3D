/** Manual, deterministic round-lifetime recorder soak; host JS timings only.
 * Run with: npm run bench:round-lifetime -- --seconds=180
 * For retained heap measurements: node --expose-gc --experimental-strip-types scripts/bench-breach-round-lifetime.mjs
 * Never interpret these results as mobile FPS or GPU timings.
 */
import {performance} from 'node:perf_hooks';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';

const requested=Number(process.argv.find(a=>a.startsWith('--seconds='))?.split('=')[1]??180);
if(!Number.isFinite(requested)||requested<5||requested>600)
  throw Error('seconds must be between 5 and 600');
const seconds=requested,steps=Math.floor(seconds*60);
const session=newSession(0,17,'floor-plan','standard');
const recorder=new MissionRecorder();
recorder.capture(session,true);
session.started=true;session.phase='running';
const start=session.operators.map(a=>({x:a.p.x,y:a.p.y,heading:a.heading}));
const durations=[];
const quantile=(v,p)=>{
  if(!v.length)return 0;
  const sorted=[...v].sort((a,b)=>a-b);
  return +sorted[Math.floor((sorted.length-1)*p)].toFixed(3);
};
const report=tick=>{
  // Optional full GC happens OUTSIDE the measured capture timings.
  globalThis.gc?.();
  const heapMB=+(process.memoryUsage().heapUsed/1048576).toFixed(1);
  const row={seconds:tick/60,frames:recorder.frames.length,
    steps:recorder.motion.stepEventCount,
    captureP50ms:quantile(durations,.5),captureP95ms:quantile(durations,.95),
    captureMaxMs:quantile(durations,1),heapMB,
    sharedActorFields:recorder.sharingStats.sharedFields,
    complete:recorder.completeness.complete};
  console.log('ROUND_LIFETIME',JSON.stringify(row));
  durations.length=0;
};
console.log('ENVIRONMENT',JSON.stringify({node:process.version,
  seconds,actors:session.operators.length,forcedGC:typeof globalThis.gc==='function'}));
for(let tick=1;tick<=steps;tick++){
  session.seconds=tick/60;
  // Repeatable small real-movement-like changes force unique pose samples,
  // while authored plans and immutable loadouts stay constant.
  session.operators.forEach((a,i)=>{
    a.p.x=start[i].x+Math.sin(tick/37+i)*3;
    a.p.y=start[i].y+Math.cos(tick/53+i)*3;
    a.heading=start[i].heading+Math.sin(tick/79+i)*.09;
    a.velocity=12+Math.sin(tick/29+i)*4;
  });
  const before=performance.now();
  recorder.capture(session);
  durations.push(performance.now()-before);
  if(tick%1800===0||tick===steps)report(tick);
}
console.log('FILM_COMPLETE',JSON.stringify({seconds:recorder.duration,
  frames:recorder.frames.length,truncated:!recorder.completeness.complete}));
