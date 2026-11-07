/** V3 Lab-only upper-body assist: choose an authored small yaw correction
 * when it improves a valid coupled arm pose. Never rotate live shot authority.
 * One finite search per cached outfit/yaw; no frame-to-frame accumulation.
 */
import type {CoupledLowReadySolution} from './breach-coupled-low-ready.ts';
export type AssistedCoupledPose={yaw:number;solution:CoupledLowReadySolution};
export const TORSO_ASSIST_YAWS=Object.freeze([0,-.08,.08,-.16,.16] as const);
export function chooseTorsoAssist(
 solve:(yaw:number)=>CoupledLowReadySolution|null,
 previewEnabled:boolean,
 /** Optional real shoulder when fitting a bulky carrier's firing elbow. */
 firingShoulder?:{y:number;z:number}
):AssistedCoupledPose|null{
 const offsets=previewEnabled?TORSO_ASSIST_YAWS:[0];
 let best:AssistedCoupledPose|null=null;
 let bestTier=Infinity,bestScore=Infinity;
 for(const yaw of offsets){
  const solution=solve(yaw);if(!solution)continue;
  const tier=solution.status==='clear'?0:
   solution.status==='guard-fallback'?1:2;
  // Under bulky heavy carriers, do not select a visibly horizontal,
  // winged firing elbow merely because another contact scores lower.
  // This only ranks valid poses; the fixed arm lengths, torso/plate
  // intersections and the bounded +/-0.16 rad body assist still apply.
  const firing=solution.arms?.[1]?.joint;
  const drop=firing&&firingShoulder?
   firingShoulder.y-firing.y:Infinity;
  const flare=firing&&firingShoulder?
   firing.z-firingShoulder.z:0;
  const wingPenalty=Number.isFinite(drop)?
    Math.max(0,3.4-drop)*2.8+Math.max(0,flare-2.8)*.70:0;
  const score=solution.quality+Math.abs(yaw)*1.8+wingPenalty;
  if(tier<bestTier||tier===bestTier&&score<bestScore-1e-9){
   bestTier=tier;bestScore=score;best={yaw,solution};
  }
 }
 return best;
}
