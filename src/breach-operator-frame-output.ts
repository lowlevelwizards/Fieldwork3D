/** Package B6 — final operator root/pelvis/chest/head pose output.
 * The five non-rendered working objects keep the *same* Three.js coordinate
 * hierarchy as the real rig, so historical IK, drop/sling and action socket
 * calculations can consume this frame's matrices without writing displayed
 * scene nodes before B2's single full-pose commit.
 *
 * Rig-specific body/turn clocks are unchanged, and no scene graph child is
 * added: the working root borrows the real root's external parent world matrix
 * only for coordinate conversion. Do not pass this view into appearance or
 * gear/model building (which intentionally mutates the visible rig).
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPoseScratch,LegPoseOutputSlot}
 from './breach-operator-pose-scratch.ts';

type FramePose=OperatorPoseScratch['frameOutput'];
function syncTransform(to:THREE.Object3D,from:THREE.Object3D){
 to.position.copy(from.position);
 to.quaternion.copy(from.quaternion);
 to.scale.copy(from.scale);
 to.visible=from.visible;
}
function slotValues(node:THREE.Object3D,slot:LegPoseOutputSlot){
 const v=slot.values;
 v[0]=node.position.x;v[1]=node.position.y;v[2]=node.position.z;
 v[3]=node.quaternion.x;v[4]=node.quaternion.y;
 v[5]=node.quaternion.z;v[6]=node.quaternion.w;
 v[7]=node.scale.x;v[8]=node.scale.y;v[9]=node.scale.z;
 v[10]=node.visible?1:0;
}
/** Set up the stable per-rig working view, syncing the latest actual external
 * world placement and last committed transforms. An operator can be moved by
 * the tactical scene between poses; its X/Z/world parent are never reset.
 */
export function beginOperatorFramePose(r:OperatorRig,
 scratch:OperatorPoseScratch):FramePose{
 const f=scratch.frameOutput;
 if(!f.initialized){
  const view=Object.create(r) as OperatorRig;
  Object.defineProperties(view,{
   root:{value:f.root,writable:false,configurable:false},
   legacyFrame:{value:f.legacyFrame,writable:false,configurable:false},
   hip:{value:f.hip,writable:false,configurable:false},
   chest:{value:f.chest,writable:false,configurable:false},
   head:{value:f.head,writable:false,configurable:false}
  });
  f.rigView=view;
  f.initialized=true;
 }
 // The external scene placement remains the authoritative motor transform.
 // The parent pointer is used for matrix math, but the working root is NOT
 // inserted into that parent's children (no draw calls or render traversal).
 f.root.parent=r.root.parent;
 f.root.userData=r.root.userData;
 syncTransform(f.root,r.root);
 syncTransform(f.legacyFrame,r.legacyFrame);
 syncTransform(f.hip,r.hip);
 syncTransform(f.chest,r.chest);
 syncTransform(f.head,r.head);
 return f;
}
export function workingOperatorRig(frame:FramePose):OperatorRig{
 if(!frame.initialized||!frame.rigView)
  throw new Error('B6 frame hierarchy used before rig initialization');
 return frame.rigView as OperatorRig;
}
/** The ONLY B6 output extraction. Inputs are independent working
 * components, never reads from the registered visible pose-output nodes.
 * Returned tuples are stable B2-compatible buffers, not scene references.
 */
export function finishOperatorFramePose(frame:FramePose):FramePose{
 if(!frame.initialized)throw new Error('B6 frame not initialized');
 slotValues(frame.root,frame.frameOutputs[0]);
 slotValues(frame.legacyFrame,frame.frameOutputs[1]);
 slotValues(frame.hip,frame.bodyOutputs[0]);
 slotValues(frame.chest,frame.bodyOutputs[1]);
 slotValues(frame.head,frame.bodyOutputs[2]);
 return frame;
}
