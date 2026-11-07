/** B25: receiver-local operating-hand accents on the existing physical
 * magazine motion. The true magazine insertion socket remains unchanged.
 * Later stages add AK/HK visible operating control art and pouch retrieval.
 */
import * as THREE from 'three';
import {choreographV3ReloadHand,
 type ReloadChoreographyRequest,type ReloadChoreographyResult}
 from './breach-pose-v3-reload-choreography.ts';
import {reloadAnimationCue,type ReloadMechanism}
 from './breach-reload-performance.ts';
import {v4ReloadPouchReach} from './breach-reload-v4-magazine-handoff.ts';
export function choreographV4ReloadHand(
 input:ReloadChoreographyRequest,mechanism:ReloadMechanism
):ReloadChoreographyResult{
 const legacy=choreographV3ReloadHand(input);
 const cue=reloadAnimationCue(mechanism,input.mode,input.progress);
 // An actual occupied pouch becomes the rendezvous, not a nominal chest
 // offset. Both IK and renderer receive this same deterministic target.
 if(input.pickupTarget&&input.mode!=='shells'){
  const w=v4ReloadPouchReach(input.progress);
  if(w>0)return {...legacy,target:legacy.target.clone()
    .lerp(input.pickupTarget,w),segment:'transport'};
 }
 // A single receiver-authored point drives each family. AK crosses to
 // the operating handle; HK reaches the left cocking tube to lock and
 // gives it its short, sharp slap after the magazine seats. AR presses
 // the bolt catch. Retention never invents an empty-reload gesture.
 if(cue.gesture!=='none'&&cue.gestureWeight>0&&input.reloadControl){
  const {x,y,z}=input.reloadControl;
  const control=new THREE.Vector3(x*input.lengthScale,y,z)
   .applyEuler(input.fit.rotation).add(input.fit.origin);
  return {...legacy,target:legacy.target.clone().lerp(
   control,cue.gestureWeight),
   segment:cue.gesture==='hk-cock-lock'?'release':'return'};
 }
 return legacy;
}
