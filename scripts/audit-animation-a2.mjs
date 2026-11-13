/** A2.0 reproducible time-series: identical tracks before and after A2.1.
 * This is a diagnostic animation corpus, NOT an estimated GPU frame rate.
 * Run node --experimental-strip-types scripts/audit-animation-a2.mjs
 *   --out artifacts/animation-a2/report.json
 */
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {LabDistanceMotionCache} from '../src/breach-lab-tracks.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {captureAnimationQuality,compareAnimationFrames}
 from '../src/breach-animation-quality.ts';
const TRACKS=['idle','walk','run','accelerate','stop','back',
 'strafe-left','strafe-reverse','turn-90','pivot-reverse',
 'pie','crouch-walk','wounded','active-aim'];
const TIMES=[0,.10,.20,.35,.55,.75,1,1.25,1.5,1.75,2,2.4,2.8,3.2,3.6,4];
const round=x=>Math.round(x*10000)/10000;
const report={schema:1,stage:'A2.0–A2.1',ticks:'fixed 60Hz recorded hybrid feet',
 samples:TIMES,tracks:[],summary:{failureCount:0,scenarioCount:TRACKS.length},
 caveats:['Node CPU pose timings are observational, not phone frame rates',
 'Motion gallery WebGL screenshots require separate visual approval',
 'Raw hidden attachment transforms do not count as visible pose drift']};
for(const track of TRACKS){
 const cache=new LabDistanceMotionCache(track);
 const rig=createOperatorRig('a2-motion-'+track,'blue',true);
 const records=[];
 try{
  for(const time of TIMES){
   const {motion:m,feet}=cache.sample(time);
   const args={x:m.x,z:m.z,heading:m.heading,travelYaw:m.travelYaw,
    pelvisYaw:-m.heading,velocity:m.speed,seconds:time,stride:0,
    posture:m.posture,injury:m.injury,weapon:'carbine',
    reload:m.reload,reloadDuration:1.8,reloadMode:'emergency',
    lastThrowAt:m.throwAt,lastDoorAt:m.doorAt,
    down:m.down,surrender:false,aiming:m.aim>.3,firing:false,
    aimBlend:m.aim,turning:m.turning,deterministic:true,
    poseDiagnostics:false,poseV3Preview:true,poseV4ReloadPreview:true,
    replayFeet:feet,gait:track==='run'?'run':
     track==='pie'?'pie':'walk'};
   const body=bodyFromContacts({velocity:m.speed,heading:m.heading,
    travelYaw:m.travelYaw,turning:m.turning,injury:m.injury,
    posture:m.posture,feet,position:{x:m.x,y:m.z},
    gait:args.gait,seconds:time});
   const start=performance.now();
   poseOperator(rig,args,0);
   const elapsed=performance.now()-start;
   const first=captureAnimationQuality(rig,time);
   // Same instant cannot accumulate pose history. Changed invisible
   // detached-magazine transforms are still retained in the diagnostics.
   poseOperator(rig,args,0);
   const second=captureAnimationQuality(rig,time);
   const repeat=compareAnimationFrames(first,second);
   if(first.invalidSlots||first.slotCount!==30||repeat.frozenDrift)
    report.summary.failureCount++;
   records.push({time,root:[round(m.x),round(m.z)],
    speed:round(m.speed),support:round(body.support),
    pelvisY:round(body.pelvisY),pelvisSide:round(body.pelvisSide),
    torsoForward:round(body.torsoForward),
    torsoSide:round(body.torsoSide),
    headCounter:round(body.headCounter),
    planted:feet.filter(f=>f.contact).length,
    gripError:round(first.gripError),
    stockError:round(first.stockError),
    unreachableLegs:first.unreachableLegs,
    slotCount:first.slotCount,
    visibleDrift:repeat.frozenDrift,
    poseCpuMs:round(elapsed)});
  }
  const values=records.map(r=>r.poseCpuMs).sort((a,b)=>a-b);
  report.tracks.push({name:track,frames:records,
   observedMedianPoseCpuMs:values[Math.floor(values.length*.5)],
   observedP95PoseCpuMs:values[Math.floor(values.length*.95)]});
 }finally{rig.dispose();}
}
const pathIndex=process.argv.indexOf('--out');
if(pathIndex!==-1){
 const file=process.argv[pathIndex+1];
 if(!file)throw Error('--out requires a path');
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({stage:report.stage,
 scenarios:report.summary.scenarioCount,failures:report.summary.failureCount,
 sampleTimes:TIMES.length,
 cpuTiming:'observational only'},null,2));
if(report.summary.failureCount)process.exitCode=1;
