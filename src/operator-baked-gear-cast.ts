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
type BoxRecord={min:[number,number,number];max:[number,number,number]};
const frontRays=[
 new THREE.Vector3(.46,.88,.07).normalize(),
 new THREE.Vector3(.43,.90,.03).normalize(),
 new THREE.Vector3(.47,.88,.04).normalize()
] as const;
const rearRays=frontRays.map(r=>new THREE.Vector3(-r.x,r.y,r.z));
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
  if(!(mesh instanceof THREE.Mesh)||
    !mesh.geometry.getAttribute('position')||
    mesh.geometry.getAttribute('position').count===0)continue;
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  if(!mesh.geometry.boundingBox)continue;
  mesh.updateMatrix();
  const b=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
  if(!b.isEmpty())boxes.push(toRecord(b));
 }
 if(boxes.length)group.userData.fieldworkShadowVolumes=boxes;
}
/** Convert saved source geometry boxes into the chest's common local frame.
 * Preserve small individual pouches even if the source now draws as one mesh.
 */
export function collectCastVolumes(root:THREE.Object3D,
 chest:THREE.Object3D):THREE.Box3[]{
 root.updateWorldMatrix(true,true);
 chest.updateWorldMatrix(true,true);
 const inverse=chest.matrixWorld.clone().invert();
 const boxes:THREE.Box3[]=[];
 root.traverse(node=>{
  if(!node.visible)return;
  if(node instanceof THREE.Group){
   const stored=node.userData.fieldworkShadowVolumes as BoxRecord[]|undefined;
   if(stored){
    const transform=inverse.clone().multiply(node.matrixWorld);
    for(const b of stored)boxes.push(fromRecord(b).applyMatrix4(transform));
   }
  }
  if(!(node instanceof THREE.Mesh)||!node.geometry.getAttribute('position')||
   (node.parent instanceof THREE.Group&&
    node.parent.userData.fieldworkShadowVolumes))return;
  if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();
  if(!node.geometry.boundingBox)return;
  const transform=inverse.clone().multiply(node.matrixWorld);
  boxes.push(node.geometry.boundingBox.clone().applyMatrix4(transform));
 });
 return boxes;
}
function rayHits(p:THREE.Vector3,dir:THREE.Vector3,
 box:THREE.Box3):boolean{
 let near=0,far=2.75;
 for(const axis of ['x','y','z'] as const){
  const d=dir[axis],o=p[axis];
  if(Math.abs(d)<1e-6){
   if(o<box.min[axis]||o>box.max[axis])return false;
  }else{
   const t0=(box.min[axis]-o)/d,t1=(box.max[axis]-o)/d;
   near=Math.max(near,Math.min(t0,t1));
   far=Math.min(far,Math.max(t0,t1));
   if(near>far)return false;
  }
 }
 return near>.035&&far>.045;
}
export type GearLightingBake={key:string;changed:number;vertices:number};
/** Bake separately for different receiver groups, using all of their
 * true light casters. The key includes GEOMETRY choices only, never colors.
 */
export function bakeCastOnGear(
 receiver:THREE.Object3D,cas:readonly THREE.Object3D[],
 chest:THREE.Object3D,key:string):GearLightingBake{
 const sources=cas.filter(x=>x!==receiver&&x.visible);
 const boxes=sources.flatMap(x=>collectCastVolumes(x,chest));
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
  if(geometry.userData.fieldworkCrossLightKey===key)return;
  const array=attribute.array as Uint8Array;
  let baseline=geometry.userData.fieldworkCrossLightBase as Uint8Array|undefined;
  if(!baseline||baseline.length!==array.length){
   baseline=new Uint8Array(array);geometry.userData.fieldworkCrossLightBase=baseline;
  }
  array.set(baseline);
  object.updateWorldMatrix(true,false);
  const toChest=inverse.clone().multiply(object.matrixWorld);
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(toChest);
  for(let i=0;i<coords.count;i++){
   position.fromBufferAttribute(coords,i).applyMatrix4(toChest);
   normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();
   const rays=normal.x<-.25?rearRays:frontRays;
   origin.copy(position).addScaledVector(normal,.075);
   let hits=0;
   for(const ray of rays){
    if(normal.dot(ray)<.02)continue;
    for(const box of boxes){
     if(rayHits(origin,ray,box)){hits++;break;}
    }
   }
   const occlusion=hits/rays.length;
   // Strong, but avoid chalky whites and completely black kit shadows.
   // A restrained miniature gradient supports the tiny cast edges; it
   // must never create broad dark fields across whole chest panels.
   const lower=THREE.MathUtils.clamp((7-position.y)/18,0,1);
   const light=(1-.36*occlusion)*(1-.045*lower);
   const before=baseline[i*3]/255;
   const value=Math.round(255*Math.max(.62,before*light));
   if(value<array[i*3])changed++;
   array[i*3]=value;array[i*3+1]=value;array[i*3+2]=value;
   vertices++;
  }
  // Reverting stale lightmaps to an unoccluded style must also upload.
  attribute.needsUpdate=true;
  geometry.userData.fieldworkCrossLightKey=key;
 });
 return {key,changed,vertices};
}
