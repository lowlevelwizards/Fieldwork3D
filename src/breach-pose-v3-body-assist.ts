/** V3 Lab-only upper-body assist: choose an authored small yaw correction
 * when it improves a valid coupled arm pose. Never rotate live shot authority.
 * One finite search per cached outfit/yaw; no frame-to-frame accumulation.
 */
import type {CoupledLowReadySolution} from './breach-coupled-low-ready.ts';
export type AssistedCoupledPose={yaw:number;solution:CoupledLowReadySolution};
export const TORSO_ASSIST_YAWS=Object.freeze([0,-.08,.08,-.16,.16] as const);
export function chooseTorsoAssist(
 solve:(yaw:number)=>CoupledLowReadySolution|null,
 previewEnabled:boolean
):AssistedCoupledPose|null{
 const offsets=previewEnabled?TORSO_ASSIST_YAWS:[0];
 let best:AssistedCoupledPose|null=null;
 let bestTier=Infinity,bestScore=Infinity;
 for(const yaw of offsets){
  const solution=solve(yaw);if(!solution)continue;
  const tier=solution.status==='clear'?0:
   solution.status==='guard-fallback'?1:2;
  // Small, bounded torso changes must buy perceptibly better elbow quality.
  const score=solution.quality+Math.abs(yaw)*1.8;
  if(tier<bestTier||tier===bestTier&&score<bestScore-1e-9){
   bestTier=tier;bestScore=score;best={yaw,solution};
  }
 }
 return best;
}
