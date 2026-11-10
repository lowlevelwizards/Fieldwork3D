/** Closeout Stage 4: one explicitly owned, bounded pose-output surface.
 *
 * Legacy IK/choreography can continue to evaluate in its current rig-local
 * working hierarchy. Once all stages finish, this output becomes the single
 * public COMMIT boundary for actor anatomy, held/dropped firearm, limbs and
 * action attachments. Future solvers can fill these slots directly without
 * changing the tactical renderer, replay, Lab or the physical muzzle solver.
 *
 * This file never advances simulation time or touches recorded contacts.
 * Matrices are rig-local; the scene retains ownership of world X/Z placement.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';

export type PoseOutputOwner='frame'|'body'|'lower-body'|'upper-body'|
 'weapon'|'attachments';
export type PoseOutputSlot={
 readonly id:string;readonly owner:PoseOutputOwner;
 readonly node:THREE.Object3D;
 /** Position XYZ, quaternion XYZW, scale XYZ, visible. */
 readonly values:Float64Array;
};
export type OperatorPoseOutput={
 readonly slots:readonly PoseOutputSlot[];
 readonly slotCount:number;
 readonly time:number;
 readonly generation:number;
 readonly valid:boolean;
};
/** Each named scene node has exactly ONE final output owner. Never register
 * costume geometry, authored sockets or persistent world-camera nodes here.
 */
function poseOutputNodes(r:OperatorRig):Array<{
 id:string;owner:PoseOutputOwner;node:THREE.Object3D
}>{
 const nodes:Array<{id:string;owner:PoseOutputOwner;node:THREE.Object3D}>=[
  {id:'root',owner:'frame',node:r.root},
  {id:'legacy-frame',owner:'frame',node:r.legacyFrame},
  {id:'pelvis',owner:'body',node:r.hip},
  {id:'chest',owner:'body',node:r.chest},
  {id:'head',owner:'body',node:r.head},
  {id:'held-weapon',owner:'weapon',node:r.weapon},
  {id:'dropped-weapon',owner:'weapon',node:r.droppedGun},
  {id:'inserted-magazine',owner:'attachments',node:r.magazineInserted},
  {id:'hand-magazine',owner:'attachments',node:r.magazineHand},
  {id:'detached-magazine',owner:'attachments',node:r.detachedMagazine},
  {id:'reload-control',owner:'attachments',node:r.reloadControlMesh},
  {id:'medical-item',owner:'attachments',node:r.medicalItem},
  {id:'backpack',owner:'attachments',node:r.pack}
 ];
 for(let i=0;i<r.arms.length;i++){
  const a=r.arms[i],prefix='arm-'+i;
  nodes.push(
   {id:prefix+'-upper',owner:'upper-body',node:a.upper},
   {id:prefix+'-lower',owner:'upper-body',node:a.lower},
   {id:prefix+'-hand',owner:'upper-body',node:a.hand});
 }
 for(let i=0;i<r.feet.length;i++){
  const f=r.feet[i],prefix='leg-'+i;
  nodes.push(
   {id:prefix+'-upper',owner:'lower-body',node:f.upper},
   {id:prefix+'-lower',owner:'lower-body',node:f.lower},
   {id:prefix+'-shoe',owner:'lower-body',node:f.shoe},
   {id:prefix+'-ankle',owner:'lower-body',node:f.ankleLink});
 }
 for(let i=0;i<r.slingStraps.length;i++)
  nodes.push({id:'sling-'+i,owner:'attachments',node:r.slingStraps[i]});
 return nodes;
}
type MutableOutput={
 slots:PoseOutputSlot[];slotCount:number;time:number;generation:number;valid:boolean;
};
const outputs=new WeakMap<OperatorRig,MutableOutput>();
function outputFor(r:OperatorRig):MutableOutput{
 let output=outputs.get(r);
 if(output)return output;
 const declared=poseOutputNodes(r);
 const ids=new Set<string>(),objects=new Set<THREE.Object3D>();
 for(const node of declared){
  if(ids.has(node.id)||objects.has(node.node))
   throw new Error('Duplicate pose-output owner: '+node.id);
  ids.add(node.id);objects.add(node.node);
 }
 output={slots:declared.map(node=>({...node,values:new Float64Array(11)})),
  slotCount:declared.length,time:0,generation:0,valid:false};
 outputs.set(r,output);
 return output;
}
/** A positional, quaternion and scale solution lives in one bounded rig-local
 * output buffer. No node objects, arrays or Vector3 instances per render.
 * Input remains read-only; golden pose values are not normalized or tuned.
 */
export function captureOperatorPoseOutput(r:OperatorRig,p:OperatorPose):
 OperatorPoseOutput{
 const output=outputFor(r);
 for(const slot of output.slots){
  const n=slot.node,v=slot.values;
  v[0]=n.position.x;v[1]=n.position.y;v[2]=n.position.z;
  v[3]=n.quaternion.x;v[4]=n.quaternion.y;
  v[5]=n.quaternion.z;v[6]=n.quaternion.w;
  v[7]=n.scale.x;v[8]=n.scale.y;v[9]=n.scale.z;
  v[10]=n.visible?1:0;
  for(let i=0;i<10;i++)
   if(!Number.isFinite(v[i]))
    throw new Error('Non-finite pose output '+slot.id+'['+i+']');
 }
 output.time=p.seconds;
 output.generation++;
 output.valid=true;
 return output;
}
/** This is the ONLY published frame commit. Solvers may mutate their
 * existing working hierarchy during evaluation, but neither the scene nor
 * a future replacement solver receives another transform-commit entry.
 * Equality guards avoid extra matrix dirties in the compatibility path.
 */
export function commitOperatorPoseOutput(r:OperatorRig,p:OperatorPose):void{
 const frame=captureOperatorPoseOutput(r,p);
 for(const slot of frame.slots){
  const n=slot.node,v=slot.values;
  if(n.position.x!==v[0]||n.position.y!==v[1]||n.position.z!==v[2])
   n.position.set(v[0],v[1],v[2]);
  if(n.quaternion.x!==v[3]||n.quaternion.y!==v[4]||
     n.quaternion.z!==v[5]||n.quaternion.w!==v[6])
   n.quaternion.set(v[3],v[4],v[5],v[6]);
  if(n.scale.x!==v[7]||n.scale.y!==v[8]||n.scale.z!==v[9])
   n.scale.set(v[7],v[8],v[9]);
  const visible=v[10]===1;
  if(n.visible!==visible)n.visible=visible;
 }
}
/** Introspection for Lab and diagnostics only. Mutating the returned typed
 * slot values is unsupported; no simulation or renderer uses this accessor.
 */
export function inspectOperatorPoseOutput(r:OperatorRig):
 OperatorPoseOutput|null{
 return outputs.get(r)??null;
}
export function resetOperatorPoseOutput(r:OperatorRig):void{
 outputs.delete(r);
}
