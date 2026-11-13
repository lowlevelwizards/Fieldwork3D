/** A2.5: bounded, render-only local transform continuity.
 * One shared response curve for a weapon and BOTH hands/elbows prevents
 * independent per-joint spring clocks. No allocations, physics, authoring,
 * foot scheduling or simulation state. Called only on complete B2 stages.
 */
export type PoseContinuityGroup='body'|'head'|'carry';
export const POSE_CONTINUITY_SECONDS={
 body:.075,head:.085,carry:.065
} as const;
export function poseContinuityAlpha(elapsed:number,
 group:PoseContinuityGroup):number{
 if(!Number.isFinite(elapsed)||elapsed<=0)return 0;
 // Frame spikes and replay gaps are explicit discontinuities, not
 // hundreds of milliseconds of deferred slow motion.
 if(elapsed>.35)return 1;
 return Math.min(1,1-Math.exp(-elapsed/POSE_CONTINUITY_SECONDS[group]));
}
/** Blend staged local XYZ and quaternion into a complete published snapshot.
 * Retain discrete visibility and scale (magazines/weapon swapping must never
 * ghost). Shortest-arc slerp handles opposite quaternion signs. Both inputs
 * are rig-owned typed buffers; only current[] is written.
 */
export function blendPoseTransform(previous:Float64Array,
 current:Float64Array,alpha:number):void{
 if(alpha>=1||previous[10]!==1||current[10]!==1)return;
 const t=Math.max(0,alpha);
 for(let i=0;i<3;i++)
  current[i]=previous[i]+(current[i]-previous[i])*t;
 let bx=current[3],by=current[4],bz=current[5],bw=current[6];
 const ax=previous[3],ay=previous[4],az=previous[5],aw=previous[6];
 let dot=ax*bx+ay*by+az*bz+aw*bw;
 if(dot<0){dot=-dot;bx=-bx;by=-by;bz=-bz;bw=-bw;}
 dot=Math.min(1,Math.max(-1,dot));
 let a=1-t,b=t;
 if(dot<.9995){
  const theta=Math.acos(dot),sin=Math.sin(theta);
  if(sin>1e-8){a=Math.sin((1-t)*theta)/sin;
   b=Math.sin(t*theta)/sin;}
 }
 const x=a*ax+b*bx,y=a*ay+b*by,z=a*az+b*bz,w=a*aw+b*bw;
 const norm=Math.hypot(x,y,z,w);
 if(norm>1e-8){
  current[3]=x/norm;current[4]=y/norm;
  current[5]=z/norm;current[6]=w/norm;
 }
}
