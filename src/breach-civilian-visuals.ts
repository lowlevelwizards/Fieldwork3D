/** Small voxel civilian rigs: no weapon, tactical vest, procedural curves
 * or second wardrobe/IK pipeline. Reuse shared box geometry and materials. */
import * as THREE from 'three';
import type {CivilianActor} from './breach-civilian-types.ts';
const forms={
 torso:new THREE.BoxGeometry(15,15,9),
 coat:new THREE.BoxGeometry(17,17,10),
 head:new THREE.BoxGeometry(9,9,9),
 arm:new THREE.BoxGeometry(4,12,5),
 leg:new THREE.BoxGeometry(6,12,7),
 shoe:new THREE.BoxGeometry(7,4,9)
};
const cloth=[0x837c70,0x677b70,0x8c736c,0x87816d,0x637584,0x947e69];
const pants=[0x474c4e,0x5a544c,0x555c51,0x4b5962];
const skin=[0xb99579,0x916d56,0xd5b696,0x6d4e3f];
const materialCache=new Map<number,THREE.MeshStandardMaterial>();
const mat=(hex:number)=>{
 let m=materialCache.get(hex);
 if(!m){m=new THREE.MeshStandardMaterial({color:hex,roughness:1,
   flatShading:true});materialCache.set(hex,m);}
 return m;
};
function box(geometry:THREE.BoxGeometry,color:number,
 x:number,y:number,z:number,parent:THREE.Group):THREE.Mesh{
 const mesh=new THREE.Mesh(geometry,mat(color));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
export type CivilianRig={
 root:THREE.Group;leftArm:THREE.Mesh;rightArm:THREE.Mesh;
 leftLeg:THREE.Mesh;rightLeg:THREE.Mesh;
};
export function createCivilianRig(c:CivilianActor):CivilianRig{
 const seed=c.appearanceSeed>>>0,root=new THREE.Group();
 root.name='civilian-'+c.id;
 const torso=cloth[seed%cloth.length],trousers=pants[(seed>>>3)%pants.length];
 const face=skin[(seed>>>5)%skin.length];
 const outer=c.role==='employee'&&seed%3===0?forms.coat:forms.torso;
 box(outer,torso,0,20,0,root);
 box(forms.head,face,0,32,0,root);
 const leftArm=box(forms.arm,torso,-10,19,0,root);
 const rightArm=box(forms.arm,torso,10,19,0,root);
 const leftLeg=box(forms.leg,trousers,-4.2,7,0,root);
 const rightLeg=box(forms.leg,trousers,4.2,7,0,root);
 box(forms.shoe,0x363938,-4.2,2,2,root);
 box(forms.shoe,0x363938,4.2,2,2,root);
 return {root,leftArm,rightArm,leftLeg,rightLeg};
}
export function updateCivilianRig(r:CivilianRig,
 c:CivilianActor,now:number):void{
 r.root.position.set(c.p.x,0,c.p.y);
 r.root.rotation.set(0,-c.heading,0);
 r.root.scale.set(1,1,1);
 r.leftArm.position.set(-10,19,0);
 r.rightArm.position.set(10,19,0);
 r.leftArm.rotation.set(0,0,0);r.rightArm.rotation.set(0,0,0);
 r.leftLeg.rotation.set(0,0,0);r.rightLeg.rotation.set(0,0,0);
 if(c.state==='compliant'){
  // Raised arms form a clear Y silhouette even at distant phone scale.
  r.leftArm.position.y=30;r.rightArm.position.y=30;
  r.leftArm.rotation.z=-.55;r.rightArm.rotation.z=.55;
 }else if(c.state==='frozen'||c.state==='startled'){
  r.leftArm.rotation.z=-.25;r.rightArm.rotation.z=.25;
 }else if(c.state==='hiding'||c.state==='wounded'){
  r.root.scale.y=.73;
  r.leftArm.rotation.z=-.28;
 }else if(c.state==='incapacitated'){
  r.root.rotation.z=Math.PI*.48;
  r.root.position.y=3;
  r.root.scale.set(.88,.88,.88);
 }else if(c.velocity>5){
  const gait=Math.sin(now*(c.state==='fleeing'?14:8)+
    c.appearanceSeed*.01)*.32;
  r.leftLeg.rotation.x=gait;r.rightLeg.rotation.x=-gait;
  r.leftArm.rotation.x=-gait*.65;r.rightArm.rotation.x=gait*.65;
 }
}
