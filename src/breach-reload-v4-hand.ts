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
export function choreographV4ReloadHand(
 input:ReloadChoreographyRequest,mechanism:ReloadMechanism
):ReloadChoreographyResult{
 const legacy=choreographV3ReloadHand(input);
 const cue=reloadAnimationCue(mechanism,input.mode,input.progress);
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
