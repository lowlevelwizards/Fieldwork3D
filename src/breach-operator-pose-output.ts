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
import {poseContinuityAlpha,blendPoseTransform,
 type PoseContinuityGroup} from './breach-pose-continuity.ts';

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
/** B2: Explicit final-stage schedule. This is a presentation output grouping,
 * not a second gait, action or animation clock. It also names the ownership
 * contract that B3–B6 solvers will populate directly.
 */
export const OPERATOR_POSE_STAGE_ORDER:readonly PoseOutputOwner[]=[
 'lower-body','upper-body','frame','body','weapon','attachments'
] as const;
const COMPLETE_STAGE_MASK=(1<<OPERATOR_POSE_STAGE_ORDER.length)-1;
type MutableOutput={
 slots:PoseOutputSlot[];slotCount:number;time:number;generation:number;valid:boolean;
 /** Separate reusable pending values; published inspection never observes
  * a partially staged frame or values from another rig. */
 staged:Float64Array[];
 indicesByStage:number[][];
 stageMask:number;pendingTime:number;pending:boolean;
 lastRenderedHandling:string|null;lastVisualSeconds:number|null;
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
 const indicesByStage=OPERATOR_POSE_STAGE_ORDER.map(()=>[] as number[]);
 for(let i=0;i<declared.length;i++){
  const index=OPERATOR_POSE_STAGE_ORDER.indexOf(declared[i].owner);
  if(index<0)throw new Error('Unregistered pose-output owner '+declared[i].id);
  indicesByStage[index].push(i);
 }
 if(indicesByStage.some(indices=>indices.length===0))
  throw new Error('Pose-output stage missing registered slots');
 output={slots:declared.map(node=>({...node,values:new Float64Array(11)})),
  slotCount:declared.length,time:0,generation:0,valid:false,
  staged:declared.map(()=>new Float64Array(11)),indicesByStage,
  stageMask:0,pendingTime:0,pending:false,lastRenderedHandling:null,
  lastVisualSeconds:null};
 outputs.set(r,output);
 return output;
}
/** Begin a new, rig-local frame. No published values, bone transforms, or
 * authoritative simulation state are modified by staging.
 */
export function beginOperatorPoseOutput(r:OperatorRig,p:OperatorPose):void{
 const output=outputFor(r);
 if(!Number.isFinite(p.seconds))throw new Error('Non-finite pose frame time');
 output.stageMask=0;
 output.pendingTime=p.seconds;
 output.pending=true;
}
/** Ready for B3–B6 solvers: an explicit local transform without a scene
 * object reference. Direct stage writers supply exactly the registered IDs
 * in that owner's stable slot order, with no fallback to a working rig.
 */
export type PoseTransformValues=readonly [
 number,number,number,number,number,number,number,
 number,number,number,number
];
export type DirectPoseOutputValue={
 readonly id:string;
 readonly values:PoseTransformValues;
};
function assertStageAvailable(output:MutableOutput,p:OperatorPose,
 owner:PoseOutputOwner):number{
 if(!output.pending||output.pendingTime!==p.seconds)
  throw new Error('Pose-output stage without matching frame: '+owner);
 const index=OPERATOR_POSE_STAGE_ORDER.indexOf(owner);
 if(index<0)throw new Error('Unknown pose-output stage: '+owner);
 if(output.stageMask&(1<<index))
  throw new Error('Duplicate pose-output stage: '+owner);
 return index;
}
/** Direct producer entrypoint: never reads or writes scene transforms.
 * An incomplete or mismatched owner set cannot publish. Callers may reuse
 * their own typed value arrays; staging buffers themselves are per-rig.
 */
export function stageDirectOperatorPoseOutput(r:OperatorRig,p:OperatorPose,
 owner:PoseOutputOwner,values:readonly DirectPoseOutputValue[]):void{
 const output=outputFor(r),index=assertStageAvailable(output,p,owner);
 const indices=output.indicesByStage[index];
 if(values.length!==indices.length)
  throw new Error('Incomplete direct pose-output stage: '+owner);
 for(let j=0;j<indices.length;j++){
  const i=indices[j],slot=output.slots[i],entry=values[j];
  if(!entry||entry.id!==slot.id||entry.values.length!==11)
   throw new Error('Incorrect direct pose-output slot: '+slot.id);
  for(let k=0;k<11;k++){
   const value=entry.values[k];
   if(!Number.isFinite(value)||
      k===10&&value!==0&&value!==1)
    throw new Error('Invalid direct pose-output '+slot.id+'['+k+']');
   output.staged[i][k]=value;
  }
 }
 output.stageMask|=1<<index;
}
/** Capture one named producer's FINAL local transforms. Working rig writers
 * remain transitional until B6; the stage contract allows their eventual
 * replacement by direct typed values without changing output consumers.
 * Staging is atomic per owner: an invalid value cannot mark it complete.
 */
export function stageOperatorPoseOutput(r:OperatorRig,p:OperatorPose,
 owner:PoseOutputOwner):void{
 const output=outputFor(r);
 const index=assertStageAvailable(output,p,owner);
 for(const i of output.indicesByStage[index]){
  const node=output.slots[i].node,v=output.staged[i];
  v[0]=node.position.x;v[1]=node.position.y;v[2]=node.position.z;
  v[3]=node.quaternion.x;v[4]=node.quaternion.y;
  v[5]=node.quaternion.z;v[6]=node.quaternion.w;
  v[7]=node.scale.x;v[8]=node.scale.y;v[9]=node.scale.z;
  v[10]=node.visible?1:0;
  for(let j=0;j<10;j++)
   if(!Number.isFinite(v[j]))
    throw new Error('Non-finite pose output '+output.slots[i].id+'['+j+']');
 }
 output.stageMask|=1<<index;
}
/** Single internal publication path. A failed or partial frame cannot
 * publish, increase generation or overwrite the previous final snapshot.
 * Equality guards avoid unnecessary matrix dirties during the B2 bridge.
 */
function publishOperatorPoseOutput(r:OperatorRig,p:OperatorPose,
 apply:boolean):OperatorPoseOutput{
 const output=outputFor(r);
 if(!output.pending||output.pendingTime!==p.seconds||
   output.stageMask!==COMPLETE_STAGE_MASK)
  throw new Error('Incomplete pose-output stages; refusing partial commit');
 for(let i=0;i<output.slots.length;i++){
  const slot=output.slots[i],v=slot.values;
  v.set(output.staged[i]);
  if(!apply)continue;
  const n=slot.node;
  // B6: Object.is distinguishes +0 from -0. Before frame/body moved
  // off-scene their working meshes already carried signed zero; a direct
  // stage may now be the first writer, and strict 11-value published/scene
  // equality must still hold. Preserve the B2 no-op fast path otherwise.
  if(!Object.is(n.position.x,v[0])||!Object.is(n.position.y,v[1])||
     !Object.is(n.position.z,v[2]))
   n.position.set(v[0],v[1],v[2]);
  if(!Object.is(n.quaternion.x,v[3])||!Object.is(n.quaternion.y,v[4])||
     !Object.is(n.quaternion.z,v[5])||!Object.is(n.quaternion.w,v[6]))
   n.quaternion.set(v[3],v[4],v[5],v[6]);
  if(!Object.is(n.scale.x,v[7])||!Object.is(n.scale.y,v[8])||
     !Object.is(n.scale.z,v[9]))
   n.scale.set(v[7],v[8],v[9]);
  const visible=v[10]===1;
  if(n.visible!==visible)n.visible=visible;
 }
 output.time=p.seconds;
 output.generation++;
 output.valid=true;
 output.pending=false;
 output.stageMask=0;
 return output;
}
/** Compatibility capture, for existing external diagnostics only.
 * No production animator uses this wrapper. It shares the same owner masks
 * and publication path, and never changes the visual rig.
 */
export function captureOperatorPoseOutput(r:OperatorRig,p:OperatorPose):
 OperatorPoseOutput{
 beginOperatorPoseOutput(r,p);
 for(const owner of OPERATOR_POSE_STAGE_ORDER)
  stageOperatorPoseOutput(r,p,owner);
 return publishOperatorPoseOutput(r,p,false);
}
/** A2.5: integrate continuity at the one atomic output boundary, AFTER all
 * IK, action and weapon solvers and BEFORE publication. All local transforms
 * of the weapon + both arms share a single alpha, so an interrupted pose
 * retargets from the last actually displayed joints. A separate body/head
 * response preserves a visible neck/shoulder connection. Never filter the
 * world root or planted feet: those belong to motor/footstep authority.
 * Visibility and equipment changes remain discrete. Replay and seeks do
 * not consume any render history.
 */
function blendCompletePoseOutput(output:MutableOutput,p:OperatorPose,
 renderedHandling:string|null):void{
 if(!output.valid||p.deterministic||p.replayFeet||p.down||p.surrender)
  return;
 const visualSeconds=p.idleLifeSeconds??p.seconds;
 const elapsed=output.lastVisualSeconds===null?0:
   visualSeconds-output.lastVisualSeconds;
 if(elapsed<0||elapsed>.35)return;
 const body=poseContinuityAlpha(elapsed,'body');
 const head=poseContinuityAlpha(elapsed,'head');
 // A named carry switch must start at the previous DISPLAYED pose,
 // never at a delayed IK target. Otherwise two different directors can
 // move the gun on the very first transition frame (ADS -> low, for example).
 const retarget=output.lastRenderedHandling!==null&&
   renderedHandling!==null&&output.lastRenderedHandling!==renderedHandling;
 const carry=retarget?0:poseContinuityAlpha(elapsed,'carry');
 for(let i=0;i<output.slotCount;i++){
  const slot=output.slots[i],id=slot.id;
  let group:PoseContinuityGroup|null=null;
  if(id==='pelvis'||id==='chest')group='body';
  else if(id==='head')group='head';
  else if(id==='held-weapon'||slot.owner==='upper-body'||
    id.startsWith('sling-'))group='carry';
  if(!group)continue;
  // Imminent hard collisions require a physically safe immediate tuck;
  // the upstream distance bands make normal short-stocking progressive.
  if(group==='carry'&&p.clearanceBlocked)continue;
  const alpha=group==='body'?body:group==='head'?head:carry;
  blendPoseTransform(slot.values,output.staged[i],alpha);
 }
}
/** The ONLY production pose commit. It publishes exactly one complete,
 * validated stage set after all procedural solutions and finalizers.
 */
export function commitOperatorPoseOutput(r:OperatorRig,p:OperatorPose):void{
 const output=outputFor(r);
 const renderedHandling=p.handlingOverride??p.clearanceCarry??
   r.lastHandling??null;
 if(output.pending&&output.pendingTime===p.seconds&&
    output.stageMask===COMPLETE_STAGE_MASK)
  blendCompletePoseOutput(output,p,renderedHandling);
 publishOperatorPoseOutput(r,p,true);
 output.lastRenderedHandling=renderedHandling;
 output.lastVisualSeconds=p.idleLifeSeconds??p.seconds;
}
/** Introspection for Lab and diagnostics only. Published buffers remain
 * stable while another frame is staged. Mutating typed values is unsupported.
 */
export function inspectOperatorPoseOutput(r:OperatorRig):
 OperatorPoseOutput|null{
 return outputs.get(r)??null;
}
export function resetOperatorPoseOutput(r:OperatorRig):void{
 outputs.delete(r);
}
