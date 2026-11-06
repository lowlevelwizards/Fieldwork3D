/** Cast fixed studio-key shadow rays FROM the receiving garment/armor TO the
 * authored equipment volumes. This is a one-time appearance/geometry bake,
 * never a real-time renderer shadow pass. Source occluders are captured BEFORE
 * the usual draw-call consolidation, so pouches/straps do not become one
 * misleading bounding box after batching.
 *
 * The vertex attribute already multiplies the albedo/camouflage uniformly.
 * A source can shade a DIFFERENT receiver: rig->armor, vest->shirt,
 * pack->jacket. All ray samples and 8-bit buffers are cached per cut combo.
 */
import * as THREE from 'three';
import {bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
import {shadowContactRule,type ShadowAssemblyRole,type ShadowContactRule}
 from './operator-gear-shadow-relationships.ts';
type BoxRecord={min:[number,number,number];max:[number,number,number];
 partId?:string;role?:string};
const frontRays=[
 new THREE.Vector3(.46,.88,.07).normalize(),
 new THREE.Vector3(.43,.90,.03).normalize(),
 new THREE.Vector3(.47,.88,.04).normalize()
] as const;
// All receivers share one real overhead key direction. Back-of-operator
// contacts come from short-range proximity, NOT a mirrored fake rear sun.
const toRecord=(box:THREE.Box3):BoxRecord=>({
 min:[box.min.x,box.min.y,box.min.z],
 max:[box.max.x,box.max.y,box.max.z]
});
const fromRecord=(b:BoxRecord)=>new THREE.Box3(
 new THREE.Vector3(...b.min),new THREE.Vector3(...b.max));
/** Executed only during wardrobe construction. Invisible alternate kit
 * groups are captured independently and cannot contaminate current gear.
 */
export function rememberUnmergedShadowVolumes(group:THREE.Group):void{
 if(group.userData.fieldworkShadowVolumes)return;
 const boxes:BoxRecord[]=[];
 for(const mesh of group.children){
  if(!(mesh instanceof THREE.Mesh)||!mesh.visible||
    !mesh.geometry.getAttribute('position')||
    mesh.geometry.getAttribute('position').count===0)continue;
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  if(!mesh.geometry.boundingBox)continue;
  mesh.updateMatrix();
  const b=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
  if(!b.isEmpty()){
   const record=toRecord(b);
   if(mesh.userData.fieldworkShadowPartId)
    record.partId=String(mesh.userData.fieldworkShadowPartId);
   if(mesh.userData.fieldworkShadowRole)
    record.role=String(mesh.userData.fieldworkShadowRole);
   boxes.push(record);
  }
 }
 if(boxes.length)group.userData.fieldworkShadowVolumes=boxes;
}
/** Preserve per-part IDs after display meshes have been merged into
 * shared materials. Original UV and geometry are never modified here.
 */
export type ShadowVolume={box:THREE.Box3;partId?:string;partRole?:string};
export function collectCastVolumeRecords(root:THREE.Object3D,
 chest:THREE.Object3D):ShadowVolume[]{
 root.updateWorldMatrix(true,true);
 chest.updateWorldMatrix(true,true);
 const inverse=chest.matrixWorld.clone().invert();
 const records:ShadowVolume[]=[];
 root.traverseVisible(node=>{
  if(node instanceof THREE.Group){
   const stored=node.userData.fieldworkShadowVolumes as BoxRecord[]|undefined;
   if(stored){
    const transform=inverse.clone().multiply(node.matrixWorld);
    for(const b of stored)records.push({
     box:fromRecord(b).applyMatrix4(transform),
     partId:b.partId,partRole:b.role
    });
   }
  }
  if(!(node instanceof THREE.Mesh)||!node.geometry.getAttribute('position')||
   (node.parent instanceof THREE.Group&&
    node.parent.userData.fieldworkShadowVolumes))return;
  if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();
  if(!node.geometry.boundingBox)return;
  const transform=inverse.clone().multiply(node.matrixWorld);
  records.push({
   box:node.geometry.boundingBox.clone().applyMatrix4(transform),
   partId:node.userData.fieldworkShadowPartId,
   partRole:node.userData.fieldworkShadowRole
  });
 });
 return records;
}
/** Historical API: tests and older consumers need plain AABBs. */
export function collectCastVolumes(root:THREE.Object3D,
 chest:THREE.Object3D):THREE.Box3[]{
 return collectCastVolumeRecords(root,chest).map(record=>record.box);
}
/** Fixed-key contact ray depth, evaluated only during the outfit bake.
 * Crisp directly beneath attachments; no long black carrier-wide shadows.
 */
const SHADOW_AXES=['x','y','z'] as const;
function rayEntryDistance(p:THREE.Vector3,dir:THREE.Vector3,
 box:THREE.Box3,maxDist=3.25):number|null{
 let near=0,far=maxDist;
 for(const axis of SHADOW_AXES){
  const d=dir[axis],o=p[axis];
  if(Math.abs(d)<1e-6){
   if(o<box.min[axis]||o>box.max[axis])return null;
  }else{
   const t0=(box.min[axis]-o)/d,t1=(box.max[axis]-o)/d;
   near=Math.max(near,Math.min(t0,t1));
   far=Math.min(far,Math.max(t0,t1));
   if(near>far)return null;
  }
 }
 return near>.045&&far>.055&&near<maxDist?near:null;
}
/** Analytic near-surface contact, independent of light direction.
 * Brings pack/jacket, carrier/shirt and lower strap attachments together
 * even where a front-biased studio key cannot project a rearward ray.
 * Bounding boxes are pre-merge INDIVIDUAL parts, not entire rig envelopes.
 */
export const CROSS_CONTACT_RADIUS=1.15;
export const CROSS_CONTACT_STRENGTH=.42;
/** Allocation-free single-box contact evaluation for tight bake loops.
 * The public multi-box helper remains API-compatible with earlier tests.
 */
export function crossEquipmentContactBox(
 point:THREE.Vector3,normal:THREE.Vector3,
 box:THREE.Box3,radius=CROSS_CONTACT_RADIUS
):number{
 const dx=Math.max(box.min.x-point.x,0,point.x-box.max.x);
 const dy=Math.max(box.min.y-point.y,0,point.y-box.max.y);
 const dz=Math.max(box.min.z-point.z,0,point.z-box.max.z);
 const d2=dx*dx+dy*dy+dz*dz;
 if(d2>=radius*radius)return 0;
 const cx=(box.min.x+box.max.x)*.5-point.x;
 const cy=(box.min.y+box.max.y)*.5-point.y;
 const cz=(box.min.z+box.max.z)*.5-point.z;
 const toward=normal.x*cx+normal.y*cy+normal.z*cz;
 if(toward<=.025)return 0;
 const length=Math.hypot(cx,cy,cz);
 const facing=length>.001?toward/length:0;
 if(facing<.15)return 0;
 const distance=Math.sqrt(d2);
 const q=THREE.MathUtils.clamp((distance-.15)/
  Math.max(.001,radius-.15),0,1);
 return (1-q*q*(3-2*q))*(.38+.62*facing);
}
export function crossEquipmentContact(
 point:THREE.Vector3,normal:THREE.Vector3,boxes:readonly THREE.Box3[],
 radius=CROSS_CONTACT_RADIUS
):number{
 let strongest=0;
 for(const box of boxes)
  strongest=Math.max(strongest,
   crossEquipmentContactBox(point,normal,box,radius));
 return strongest;
}
export type GearLightingBake={key:string;changed:number;vertices:number};
export type ShadowCaster={root:THREE.Object3D;role:ShadowAssemblyRole};
type EligibleVolume=ShadowVolume&{rule:Readonly<ShadowContactRule>};
/** Bake separately for different receiver groups, using explicit attachment
 * roles. A legacy Object3D source stays geometry-only for old callers.
 */
export function bakeCastOnGear(
 receiver:THREE.Object3D,
 cas:readonly (THREE.Object3D|ShadowCaster)[],
 chest:THREE.Object3D,key:string,
 receiverRole:ShadowAssemblyRole='generic'):GearLightingBake{
 const sources=cas.map(input=>input instanceof THREE.Object3D?
  {root:input,role:'generic' as const}:input)
  .filter(x=>x.root!==receiver&&x.root.visible);
 const bakeKey=key+'|'+receiverRole+'|'+
  sources.map(x=>x.role).join(',');
 // No shadow volume collection, world-matrix updates or mask allocation
 // when every eligible receiver already holds this exact appearance bake.
 let pending=false;
 receiver.traverse(object=>{
  if(pending||!(object instanceof THREE.Mesh)||!object.visible||
    Array.isArray(object.material)||
    object.material.userData.fieldworkBakedEquipmentAO!==true)return;
  const geo=object.geometry;
  const positions=geo.getAttribute('position'),
   normals=geo.getAttribute('normal');
  if(positions&&normals&&positions.count===normals.count&&
    geo.userData.fieldworkCrossLightKey!==bakeKey)pending=true;
 });
 if(!pending)return {key,changed:0,vertices:0};
 const boxes:EligibleVolume[]=sources.flatMap(source=>{
  const rule=shadowContactRule(receiverRole,source.role);
  if(!rule)return [];
  return collectCastVolumeRecords(source.root,chest)
   .map(volume=>({...volume,rule}));
 });
 chest.updateWorldMatrix(true,true);
 const inverse=chest.matrixWorld.clone().invert();
 let changed=0,vertices=0;
 const position=new THREE.Vector3(),normal=new THREE.Vector3(),
  origin=new THREE.Vector3();
 receiver.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||!object.visible||
    Array.isArray(object.material)||
    object.material.userData.fieldworkBakedEquipmentAO!==true)return;
  const geometry=object.geometry;
  const coords=geometry.getAttribute('position'),
   normals=geometry.getAttribute('normal');
  if(!coords||!normals||coords.count!==normals.count)return;
  bakeGearGeometryAO(geometry,object.material);
  const attribute=geometry.getAttribute('color');
  if(!attribute||!(attribute.array instanceof Uint8Array))return;
  if(geometry.userData.fieldworkCrossLightKey===bakeKey)return;
  const array=attribute.array as Uint8Array;
  let baseline=geometry.userData.fieldworkCrossLightBase as Uint8Array|undefined;
  if(!baseline||baseline.length!==array.length){
   baseline=new Uint8Array(array);geometry.userData.fieldworkCrossLightBase=baseline;
  }
  array.set(baseline);
  const storedContact=geometry.userData.fieldworkInterContactMask as
   Uint8Array|undefined;
  const storedCast=geometry.userData.fieldworkDirectionalCastMask as
   Uint8Array|undefined;
  const contactMask=storedContact?.length===coords.count?
   storedContact:new Uint8Array(coords.count);
  const castMask=storedCast?.length===coords.count?
   storedCast:new Uint8Array(coords.count);
  object.updateWorldMatrix(true,false);
  const toChest=inverse.clone().multiply(object.matrixWorld);
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(toChest);
  if(!geometry.boundingBox)geometry.computeBoundingBox();
  // A finite ray can only reach boxes within castReach + normal offset.
  // Compute this once per receiving mesh, never for every vertex/ray.
  const receiverBounds=geometry.boundingBox!.clone().applyMatrix4(toChest);
  const relevantBoxes=boxes.filter(volume=>{
   const reach=Math.max(volume.rule.castReach,
    volume.rule.contactRadius)+.076;
   const b=volume.box,a=receiverBounds;
   return a.min.x<=b.max.x+reach&&a.max.x>=b.min.x-reach&&
    a.min.y<=b.max.y+reach&&a.max.y>=b.min.y-reach&&
    a.min.z<=b.max.z+reach&&a.max.z>=b.min.z-reach;
  });
  for(let i=0;i<coords.count;i++){
   position.fromBufferAttribute(coords,i).applyMatrix4(toChest);
   normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();
   const rays=frontRays;
   origin.copy(position).addScaledVector(normal,.075);
   let castTotal=0;
   for(const ray of rays){
    if(normal.dot(ray)<.02)continue;
    let strongest=0;
    for(const volume of relevantBoxes){
     const t=rayEntryDistance(origin,ray,volume.box,
      volume.rule.castReach);
     if(t===null)continue;
     const q=THREE.MathUtils.clamp((t-.25)/
      Math.max(.01,volume.rule.castReach-.50),0,1);
     const fade=q*q*(3-2*q);
     strongest=Math.max(strongest,
      volume.rule.castStrength*(1-fade));
    }
    castTotal+=strongest;
   }
   const directionalShadow=castTotal/rays.length;
   let nearContact=0;
   for(const volume of relevantBoxes){
    const raw=crossEquipmentContactBox(position,normal,volume.box,
     volume.rule.contactRadius);
    nearContact=Math.max(nearContact,
     volume.rule.contactStrength*raw);
   }
   contactMask[i]=Math.round(255*THREE.MathUtils.clamp(
    nearContact,0,1));
   castMask[i]=Math.round(255*THREE.MathUtils.clamp(
    directionalShadow,0,1));
   // One independent occlusion composition. The root-wide height gradient
   // is owned only by operator-height-lighting, never repeated per gear.
   const shadow=Math.max(directionalShadow,nearContact);
   const light=1-shadow;
   const before=baseline[i*3]/255;
   const value=Math.round(255*Math.max(.60,before*light));
   if(value<array[i*3])changed++;
   array[i*3]=value;array[i*3+1]=value;array[i*3+2]=value;
   vertices++;
  }
  // Reverting stale lightmaps to an unoccluded style must also upload.
  attribute.needsUpdate=true;
  geometry.userData.fieldworkInterContactMask=contactMask;
  geometry.userData.fieldworkDirectionalCastMask=castMask;
  geometry.userData.fieldworkCrossLightKey=bakeKey;
 });
 return {key,changed,vertices};
}
