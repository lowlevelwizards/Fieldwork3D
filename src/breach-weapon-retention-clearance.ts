/** WR11: conservative game-art envelope clearance. Computed from cached
 * installed silhouette/accessory bounds; no per-frame geometry traversal.
 * This is a presentation envelope, not a navigation collision shape. */
import * as THREE from 'three';
import type {EquipmentExterior} from './operator-equipment-exterior.ts';
import type {RetentionShape} from './operator-retention-shape.ts';
import {packedRearSurface} from './operator-retention-pack.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
export type RetentionClearanceInput=Readonly<{
 mode:RetentionPoseMode;bounds:THREE.Box3;position:THREE.Vector3;
 quaternion:THREE.Quaternion;scale:THREE.Vector3;chestHeight:number;
 armorPush:number;pack:boolean;rigDepth?:number;beltDepth?:number;
 exterior?:EquipmentExterior;packBounds?:THREE.Box3;shape?:RetentionShape;
}>;
/** Fit against local occupied sections rather than one imaginary plane
 * spanning the entire torso. Positive or negative correction is allowed
 * along the resting normal: a separated silhouette should settle inward.
 * A single final correction owns the visual fit. */
function fitLocal(p:RetentionClearanceInput,box:THREE.Box3,correction:THREE.Vector3){
 const fit=p.exterior!;
 const shape=p.shape?.length?p.shape:undefined;
 const points=shape??[
  new THREE.Vector3(p.bounds.min.x,p.bounds.min.y,p.bounds.min.z),
  new THREE.Vector3(p.bounds.min.x,p.bounds.min.y,p.bounds.max.z),
  new THREE.Vector3(p.bounds.min.x,p.bounds.max.y,p.bounds.min.z),
  new THREE.Vector3(p.bounds.min.x,p.bounds.max.y,p.bounds.max.z),
  new THREE.Vector3(p.bounds.max.x,p.bounds.min.y,p.bounds.min.z),
  new THREE.Vector3(p.bounds.max.x,p.bounds.min.y,p.bounds.max.z),
  new THREE.Vector3(p.bounds.max.x,p.bounds.max.y,p.bounds.min.z),
  new THREE.Vector3(p.bounds.max.x,p.bounds.max.y,p.bounds.max.z)
 ];
 const world=new THREE.Vector3(),margin=.38;
 let minY=Infinity,shift=-Infinity;
 for(const point of points){
  world.copy(point).multiply(p.scale).applyQuaternion(p.quaternion).add(p.position);
  minY=Math.min(minY,world.y);
 }
 correction.y=Math.max(0,2-p.chestHeight-minY);
 for(const point of points){
  world.copy(point).multiply(p.scale).applyQuaternion(p.quaternion).add(p.position);
  const {x,z}=world,y=world.y+correction.y;
  const pack=p.packBounds;
  const packY=!!pack&&y>=pack.min.y-margin&&y<=pack.max.y+margin;
  const bodyY=y>=-9.5&&y<=7.4;
  if(p.mode==='side-slung'){
   const front=fit.front(y,0),back=fit.back(y,0);
   const body=bodyY&&x>=back-margin&&x<=front+margin;
   const bag=packY&&x>=pack!.min.x-margin&&x<=pack!.max.x+margin;
   if(!body&&!bag)continue;
   const belt=body&&y<-5.5&&y>-9.5?(p.beltDepth??0)*.65:0;
   const edge=Math.max(body?fit.side(y,x,1)+belt:-Infinity,bag?pack!.max.z:-Infinity);
   shift=Math.max(shift,edge+margin-z);
  }else{
   const body=bodyY&&Math.abs(z)<=Math.abs(fit.side(y,0,z<0?-1:1))+margin;
   const bag=p.mode==='back-slung'&&packY&&z>=pack!.min.z-margin&&z<=pack!.max.z+margin;
   if(!body&&!bag)continue;
   if(p.mode==='front-slung')shift=Math.max(shift,fit.front(y,z)+margin-x);
   else{
    const rear=packedRearSurface(body?fit.back(y,z):Infinity,y,z,pack);
    // A margin-expanded pack edge still has a real support face.
    const edge=bag?Math.min(rear,pack!.min.x):rear;
    shift=Math.max(shift,x-edge+margin);
   }
  }
 }
 // If the sampled model is entirely outside the torso section, retain the
 // authored anchor rather than dragging it across an unrelated surface.
 if(Number.isFinite(shift)){
  if(p.mode==='front-slung')correction.x=shift;
  else if(p.mode==='side-slung')correction.z=shift;
  else correction.x=-shift;
 }
 box.translate(correction);
 return {correction,box};
}
export function clearRetentionEnvelope(p:RetentionClearanceInput){
 const box=p.bounds.clone().applyMatrix4(new THREE.Matrix4().compose(
  p.position,p.quaternion,p.scale));
 const correction=new THREE.Vector3();
 if(box.isEmpty()||p.mode==='held-one')return {correction,box};
 if(p.exterior)return fitLocal(p,box,correction);
 const armor=Math.max(0,Math.min(2,p.armorPush));
 correction.y=Math.max(0,2-p.chestHeight-box.min.y);
 if(p.mode==='front-slung')
  correction.x=Math.max(0,6.5+armor+(p.rigDepth??0)-box.min.x);
 else if(p.mode==='side-slung')
  correction.z=Math.max(0,9+armor+(p.beltDepth??0)-box.min.z);
 else correction.x=-Math.max(0,box.max.x+(p.pack?13:7));
 box.translate(correction);
 return {correction,box};
}
