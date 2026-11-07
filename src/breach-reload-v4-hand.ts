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
 // On an EMPTY M4 reload, the support palm briefly presses the bolt catch
 // after the replacement magazine is seated. Retention reloads skip this.
 if(cue.gesture==='ar-bolt-release'&&
   cue.gestureWeight>0&&input.magazineSocket){
  const {x,y}=input.magazineSocket;
  const boltCatch=new THREE.Vector3(
   (x-1.10)*input.lengthScale,y+2.75,-2.85)
   .applyEuler(input.fit.rotation).add(input.fit.origin);
  return {...legacy,target:legacy.target.clone().lerp(
   boltCatch,cue.gestureWeight),segment:'return'};
 }
 return legacy;
}
