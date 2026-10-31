/** Candidate gait admission is intentionally explicit and testable.
 * Automated benchmarks are necessary, but not sufficient, to replace the
 * live gait without direct mobile visual acceptance. */
import {LabDistanceMotionCache,LabHistoricalMotionCache,
 type LabTrack,TRACK_DURATION}
  from './breach-lab-tracks.ts';
import {horizontalLegReach,LEG_HIP_SIDE} from './breach-leg-geometry.ts';
export type GaitReport={track:LabTrack;steps:number;starvations:number;
  reachViolations:number;maxAnkleOverreach:number;
  movingWithoutSteps:number;finite:boolean};
export function auditDistanceGait(track:LabTrack):GaitReport{
 const lab=new LabDistanceMotionCache(track);
 let maxOver=0,without=0,finite=true,lastStep=-1,lastRoot={x:0,z:0},drift=0;
 let last={stepsTaken:0,starvations:0,reachViolations:0};
 for(let i=0;i<=TRACK_DURATION*60;i++){
  const t=i/60,{motion,state,feet}=lab.sample(t);
  if(state.stepsTaken!==lastStep){drift=0;lastStep=state.stepsTaken;}
  else drift+=Math.hypot(motion.x-lastRoot.x,motion.z-lastRoot.z);
  without=Math.max(without,drift);
  for(let foot=0;foot<2;foot++){
   const f=feet[foot],side=foot===0?-1:1;
   const hipX=motion.x-Math.sin(motion.heading)*side*LEG_HIP_SIDE;
   const hipZ=motion.z+Math.cos(motion.heading)*side*LEG_HIP_SIDE;
   const gap=Math.hypot(f.position.x-hipX,f.position.y-hipZ);
   maxOver=Math.max(maxOver,Math.max(0,gap-horizontalLegReach()));
   finite&&=Number.isFinite(gap)&&Number.isFinite(f.height);
  }
  lastRoot={x:motion.x,z:motion.z};
  last={stepsTaken:state.stepsTaken,starvations:state.starvations,
    reachViolations:state.reachViolations};
 }
 return {track,steps:last.stepsTaken,starvations:last.starvations,
  reachViolations:last.reachViolations,maxAnkleOverreach:maxOver,
  movingWithoutSteps:without,finite};
}
export function canPromoteGait(reports:readonly GaitReport[],
  reviewedOnDevice:boolean){
 return reviewedOnDevice&&reports.length>=8&&reports.every(r=>
  r.finite&&r.starvations===0&&r.maxAnkleOverreach<.8&&
  r.movingWithoutSteps<19);
}

/** Physical touchdown metrics, sampled only from recorded 60Hz contacts. */
export function measuredGaitQuality(track:LabTrack,
 implementation:'historical'|'hybrid'){
 const lab=implementation==='historical'?
   new LabHistoricalMotionCache(track):new LabDistanceMotionCache(track);
 const touchdowns=[0,0],airborneTicks=[0,0];
 let zeroSupportTicks=0,footCrossings=0;
 let last=lab.targets[0];
 for(let k=1;k<lab.targets.length;k++){
   const feet=lab.targets[k];
   const support=feet.filter(f=>f.contact).length;
   if(!support)zeroSupportTicks++;
   for(let i=0;i<2;i++){
     if(!last[i].contact&&feet[i].contact)touchdowns[i]++;
     if(!feet[i].contact)airborneTicks[i]++;
   }
   if(feet[0].position.y>feet[1].position.y+2)
     footCrossings++;
   last=feet;
 }
 const duration=TRACK_DURATION;
 return {track,implementation,touchdowns:touchdowns[0]+touchdowns[1],
   touchesPerSecond:(touchdowns[0]+touchdowns[1])/duration,
   zeroSupportTicks,airborneTicks,footCrossings};
}
export function hybridVisualPromotionGate(
 reports:readonly GaitReport[],referenceReviewed:boolean,
 deviceReviewed:boolean,qualityPreferred:boolean){
 return canPromoteGait(reports,deviceReviewed)&&referenceReviewed&&
   qualityPreferred;
}
