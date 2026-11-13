/** A2.2: fixed-tick acceleration impulse / planted-foot pose report.
 * Actual 60 Hz movement tracks and replay-sampled foot anchors; only
 * observational Node CPU timings, never fake device GPU frame rates.
 */
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {LabDistanceMotionCache,sampleLabTrack}
 from '../src/breach-lab-tracks.ts';
import {indexMovementImpulses,sampleMovementImpulses,
 motionFromTransitions} from '../src/breach-motion-transitions.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {captureAnimationQuality,compareAnimationFrames}
 from '../src/breach-animation-quality.ts';
const tracks=['accelerate','stop','restart','run','strafe-reverse',
 'back','crouch-walk','pie'];
const samples=[0,.1,.2,.4,.7,.85,1,1.2,1.35,1.5,1.8,2.1,2.5,3,3.5];
const report={schema:1,stage:'A2.2',tracks:[],
 note:'Recorded fixed-tick feet and movement impulses; CPU-only observations',
 failures:[]};
for(const name of tracks){
 const cache=new LabDistanceMotionCache(name),events=[];
 let prev=sampleLabTrack(name,0).speed;
 for(let k=1;k<=240;k++){
  const t=k/60,s=sampleLabTrack(name,t).speed;
  const acceleration=Math.max(-230,Math.min(230,(s-prev)*60));
  if(!events.length||Math.abs(events.at(-1).acceleration-acceleration)>2)
   events.push({at:t,acceleration});
  prev=s;
 }
 const impulses=indexMovementImpulses(events);
 const rig=createOperatorRig('a22-'+name,'blue',true),records=[];
 try{
  for(const seconds of samples){
   const {motion:m,feet}=cache.sample(seconds);
   const impulse=sampleMovementImpulses(
    impulses.drive,impulses.brake,seconds);
   const previous=sampleLabTrack(name,Math.max(0,seconds-1/60));
   const acceleration=Math.max(-230,Math.min(230,
    (m.speed-previous.speed)*60));
   const gait=name==='run'?'run':name==='pie'?'pie':'walk';
   const input={velocity:m.speed,heading:m.heading,
    travelYaw:m.travelYaw,turning:m.turning,
    injury:m.injury,posture:m.posture,feet,
    position:{x:m.x,y:m.z},gait,acceleration,
    motionImpulse:impulse};
   const movement=motionFromTransitions(input);
   const body=bodyFromContacts(input);
   const p={x:m.x,z:m.z,heading:m.heading,velocity:m.speed,
    travelYaw:m.travelYaw,pelvisYaw:-m.heading,seconds,
    stride:0,posture:m.posture,injury:m.injury,weapon:'carbine',
    lastDoorAt:-100,lastThrowAt:-100,
    reload:0,reloadDuration:1.8,down:false,surrender:false,
    aiming:m.aim>.3,firing:false,aimBlend:m.aim,
    turning:m.turning,deterministic:true,replayFeet:feet,
    gait,acceleration,motionImpulse:impulse,
    poseV3Preview:true,poseV4ReloadPreview:true,
    poseDiagnostics:false};
   const start=performance.now();poseOperator(rig,p,0);
   const cpu=performance.now()-start;
   const a=captureAnimationQuality(rig,seconds);
   poseOperator(rig,p,0);
   const b=captureAnimationQuality(rig,seconds);
   const cmp=compareAnimationFrames(a,b);
   if(cmp.frozenDrift||a.invalidSlots||a.slotCount!==30)
    report.failures.push(name+' '+seconds+' pose invalid / drift');
   if(!Object.values(movement).every(Number.isFinite))
    report.failures.push(name+' '+seconds+' transition not finite');
   records.push({seconds,root:[m.x,m.z],speed:m.speed,
    momentum:impulse,movement,body:{pelvisY:body.pelvisY,
     torsoForward:body.torsoForward,
     torsoSide:body.torsoSide,headPitchCounter:body.headPitchCounter},
    planted:feet.filter(f=>f.contact).length,
    gripError:a.gripError,ankleGap:a.ankleGap,
    cpuMs:cpu});
  }
  report.tracks.push({name,records});
 }finally{rig.dispose();}
}
const i=process.argv.indexOf('--out');
if(i!==-1){
 const path=process.argv[i+1];if(!path)throw Error('--out needs a filename');
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({stage:report.stage,tracks:tracks.length,
 points:samples.length,failures:report.failures.slice(0,12),
 cpu:'observational only'},null,2));
if(report.failures.length)process.exitCode=1;
