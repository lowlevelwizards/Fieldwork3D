/** Unified upper-body fitting/cache authority.
 * Coupled low-ready, paired coordinated solving and support-grip choice
 * are specialized strategies under one owner, never separate rig writers.
 * Every cache key includes the complete relevant pose, assembly and
 * equipment state. No quantized continuous aiming and no render history.
 */
import * as THREE from 'three';
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import {solveCoupledLowReady,type CoupledLowReadySolution}
 from './breach-coupled-low-ready.ts';
import {solveV3CoordinatedPose,type CoordinatedRequest,
 type CoordinatedResult} from './breach-pose-v3-coordinated.ts';
import {chooseV3SupportGrip,type SupportGripRequest,
 type SupportGripChoice} from './breach-pose-v3-support-grip.ts';

export type CoupledFitRequest={
 weapon:WeaponId;configuration:WeaponConfiguration;
 envelope:PoseClearanceEnvelope;
 shoulders:readonly [THREE.Vector3,THREE.Vector3];
 localYaw:number;poseWeight:number;allowVisualOverlap:boolean;
};
export type FitReuse<T>={
 result:T;cached:boolean;source:'rig'|'shared'|'fresh'
};
const perRigCoupled=new WeakMap<object,{
 key:string;solution:CoupledLowReadySolution|null
}>();
const sharedCoupled=new Map<string,CoupledLowReadySolution|null>();
export const MAX_SHARED_IDLE_FITS=80;
const perRigCoordinated=new WeakMap<object,{
 key:string;result:CoordinatedResult
}>();
const perRigSupport=new WeakMap<object,{
 key:string;result:SupportGripChoice
}>();

/** Preserve the approved low-ready fit lattice until visual parity tests
 * approve its replacement: 4-decimal local yaw, 3-decimal shoulders. */
export function cachedCoupledUpperBody(rig:object,p:CoupledFitRequest,
 cachePerActor=true):FitReuse<CoupledLowReadySolution|null>{
 const key=JSON.stringify([p.weapon,p.configuration.build,
   p.configuration.slots,p.envelope.top,p.envelope.armor,p.envelope.rig,
   p.poseWeight,Number(p.localYaw.toFixed(4)),p.allowVisualOverlap,
   p.shoulders.map(v=>v.toArray().map(n=>Number(n.toFixed(3))))]);
 const local=perRigCoupled.get(rig);
 if(local?.key===key)
   return {result:local.solution,cached:true,source:'rig'};
 const hit=sharedCoupled.has(key);
 let result:CoupledLowReadySolution|null;
 if(hit)result=sharedCoupled.get(key)??null;
 else{
   result=solveCoupledLowReady({
     weapon:p.weapon,configuration:p.configuration,
     armor:p.envelope,shoulders:p.shoulders,
     nominalYaw:p.localYaw,
     allowVisualOverlap:p.allowVisualOverlap
   });
   sharedCoupled.set(key,result);
   if(sharedCoupled.size>MAX_SHARED_IDLE_FITS){
     const oldest=sharedCoupled.keys().next().value;
     if(oldest!==undefined)sharedCoupled.delete(oldest);
   }
 }
 if(cachePerActor)perRigCoupled.set(rig,{key,solution:result});
 return {result,cached:hit,source:hit?'shared':'fresh'};
}
export function cachedCoordinatedUpperBody(rig:object,p:CoordinatedRequest):
 FitReuse<CoordinatedResult>{
 const fit=p.fit;
 const key=JSON.stringify([p.weapon,p.configuration,
   p.envelope.armor,p.envelope.rig,p.envelope.top,
   fit.origin.toArray(),fit.rotation.toArray(),
   fit.stock.toArray(),fit.primary.toArray(),fit.support.toArray(),
   p.shoulders.map(v=>v.toArray()),
   (p.chestRotation??new THREE.Euler()).toArray(),
   p.releasedSupportTarget?.toArray()??null,p.mode,
   !!p.allowReloadOverlap,!!p.allowVisualOverlap]);
 const cached=perRigCoordinated.get(rig);
 if(cached?.key===key)
   return {result:cached.result,cached:true,source:'rig'};
 const result=solveV3CoordinatedPose(p);
 perRigCoordinated.set(rig,{key,result});
 return {result,cached:false,source:'fresh'};
}
export function cachedSupportUpperBody(rig:object,p:SupportGripRequest):
 FitReuse<SupportGripChoice>{
 const fit=p.fit;
 const key=JSON.stringify([p.weapon,p.configuration,
   p.envelope.armor,p.envelope.rig,p.envelope.top,
   fit.origin.toArray(),fit.rotation.toArray(),
   fit.stock.toArray(),fit.primary.toArray(),fit.support.toArray(),
   p.shoulder.toArray(),p.firingShoulder.toArray(),p.mode]);
 const cached=perRigSupport.get(rig);
 if(cached?.key===key)
   return {result:cached.result,cached:true,source:'rig'};
 const result=chooseV3SupportGrip(p);
 perRigSupport.set(rig,{key,result});
 return {result,cached:false,source:'fresh'};
}
