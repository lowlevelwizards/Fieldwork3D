/** Candidate gait admission is intentionally explicit and testable.
 * Automated benchmarks are necessary, but not sufficient, to replace the
 * live gait without direct mobile visual acceptance. */
import {LabDistanceMotionCache,type LabTrack,TRACK_DURATION}
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
