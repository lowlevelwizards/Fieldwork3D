/** Named live operator attachment anchors, sampled after posing.
 * These are measurements of existing IK transforms, not extra bones,
 * simulation bodies or adjustments to body proportions. In particular
 * the knee is the shared end of the solved upper/lower leg segments.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
export const OPERATOR_ATTACHMENT_ZONES=[
 'head','shoulder-left','shoulder-right','chest','waist',
 'hand-left','hand-right','knee-left','knee-right',
 'foot-left','foot-right','backpack'
] as const;
export type OperatorAttachmentZone=typeof OPERATOR_ATTACHMENT_ZONES[number];
export function operatorAttachmentPoint(body:OperatorRig,
 zone:OperatorAttachmentZone,out=new THREE.Vector3()):THREE.Vector3{
 body.root.updateMatrixWorld(true);
 switch(zone){
  case 'head':return out.set(0,4,0),body.head.localToWorld(out);
  case 'shoulder-left':return out.set(0,5,-7),body.chest.localToWorld(out);
  case 'shoulder-right':return out.set(0,5,7),body.chest.localToWorld(out);
  case 'chest':return out.set(6,0,0),body.chest.localToWorld(out);
  case 'waist':return body.hip.getWorldPosition(out);
  case 'hand-left':return body.arms[0].hand.getWorldPosition(out);
  case 'hand-right':return body.arms[1].hand.getWorldPosition(out);
  case 'knee-left':return out.set(0,.5,0),body.feet[0].upper.localToWorld(out);
  case 'knee-right':return out.set(0,.5,0),body.feet[1].upper.localToWorld(out);
  case 'foot-left':return body.feet[0].shoe.getWorldPosition(out);
  case 'foot-right':return body.feet[1].shoe.getWorldPosition(out);
  case 'backpack':return body.pack.getWorldPosition(out);
 }
}
