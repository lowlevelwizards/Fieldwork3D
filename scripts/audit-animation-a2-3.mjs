/** A2.3: measured fixed-tick directional motion acceptance.
 * Does not mutate runtime, draw synthetic shoes, or report invented GPU FPS.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {LabDistanceMotionCache} from '../src/breach-lab-tracks.ts';
import {measuredGaitQuality,auditDistanceGait}
 from '../src/breach-gait-acceptance.ts';
import {angleDifference} from '../src/breach-foot-yaw.ts';
import {horizontalLegReach,LEG_HIP_SIDE}
 from '../src/breach-leg-geometry.ts';
const names=['strafe-left','strafe-right','strafe-stop',
 'strafe-reverse','back','turn-90','turn-180','pivot-reverse',
 'pie','crouch-walk','squeeze','mixed','restart','stop','run'];
const result={schema:1,stage:'A2.3',tracks:[],errors:[],
 note:'Authoritative 60 Hz motor+shoe simulation; not device FPS'};
for(const name of names){
 const cache=new LabDistanceMotionCache(name);
 let zeroSupport=0,nonfinite=0,stationaryHipOver=.0,bootsMovedWithoutTouchdown=0;
 let last=cache.targets[0];
 for(let k=1;k<=240;k++){
  const {motion:m,feet,state}=cache.sample(k/60);
  if(!feet.some(f=>f.contact))zeroSupport++;
  if(!Number.isFinite(state.pelvisYaw))nonfinite++;
  for(let foot=0;foot<2;foot++){
   const a=last[foot],f=feet[foot];
   if(!Number.isFinite(f.position.x)||!Number.isFinite(f.position.y))
    nonfinite++;
   // A shoe changes its planted contact only upon a scheduled touchdown.
   if(a.contact&&f.contact&&a.phase==='planted'&&
     f.phase==='planted'&&
     Math.hypot(f.position.x-a.position.x,
      f.position.y-a.position.y)>.001)bootsMovedWithoutTouchdown++;
   if(m.speed<5){
    const h={x:m.x-Math.sin(m.heading)*(foot===0?-1:1)*LEG_HIP_SIDE,
     y:m.z+Math.cos(m.heading)*(foot===0?-1:1)*LEG_HIP_SIDE};
    const over=Math.hypot(f.position.x-h.x,f.position.y-h.y)-
     horizontalLegReach();
    stationaryHipOver=Math.max(stationaryHipOver,over);
   }
  }
  last=feet;
 }
 const final=cache.frames.at(-1);
 const gait=auditDistanceGait(name);
 const quality=measuredGaitQuality(name,'hybrid');
 const record={name,steps:final.stepsTaken,starvations:final.starvations,
  reachViolations:final.reachViolations,zeroSupport,nonfinite,
  stationaryHipOver:Math.max(0,stationaryHipOver),
  bootsMovedWithoutTouchdown,quality,gait,
  finalHipYaw:final.pelvisYaw,
  finalShoeYaw:final.feet.map(f=>f.worldYaw)};
 result.tracks.push(record);
 if(nonfinite||zeroSupport||bootsMovedWithoutTouchdown)
  result.errors.push(name+' invalid foot contacts');
 if(final.starvations>10)result.errors.push(name+' starved '+final.starvations);
}
const flag=process.argv.indexOf('--out');
if(flag>=0){
 const path=process.argv[flag+1];if(!path)throw Error('--out needs a path');
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({stage:result.stage,tracks:names.length,
 failures:result.errors,summary:result.tracks.map(t=>({
 name:t.name,steps:t.steps,starved:t.starvations,
 over:t.gait.maxAnkleOverreach}))},null,2));
if(result.errors.length)process.exitCode=1;
