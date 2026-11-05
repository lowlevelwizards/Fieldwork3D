/** Small voxel civilian rigs: no weapon, tactical vest, procedural curves
 * or second wardrobe/IK pipeline. Reuse shared box geometry and materials. */
import * as THREE from 'three';
import type {CivilianActor} from './breach-civilian-types.ts';
import {civilianPose} from './breach-civilian-pose.ts';
const forms={
 torso:new THREE.BoxGeometry(15,15,9),
 coat:new THREE.BoxGeometry(17,17,10),
 head:new THREE.BoxGeometry(9,9,9),
 arm:new THREE.BoxGeometry(4,12,5),
 leg:new THREE.BoxGeometry(6,12,7),
 shoe:new THREE.BoxGeometry(7,4,9),
 apron:new THREE.BoxGeometry(11,13,2)
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
 root:THREE.Group;head:THREE.Mesh;
 leftArm:THREE.Mesh;rightArm:THREE.Mesh;
 leftLeg:THREE.Mesh;rightLeg:THREE.Mesh;
};
export function createCivilianRig(c:CivilianActor):CivilianRig{
 const seed=c.appearanceSeed>>>0,root=new THREE.Group();
 root.name='civilian-'+c.id;
 const torso=cloth[seed%cloth.length],trousers=pants[(seed>>>3)%pants.length];
 const face=skin[(seed>>>5)%skin.length];
 const outer=c.role==='employee'&&seed%3===0?forms.coat:forms.torso;
 box(outer,torso,0,20,0,root);
 if(c.role==='employee'&&seed%4===1)
  box(forms.apron,pants[(seed>>>3)%pants.length],0,20,-5.5,root);
 const head=box(forms.head,face,0,32,0,root);
 const leftArm=box(forms.arm,torso,-10,19,0,root);
 const rightArm=box(forms.arm,torso,10,19,0,root);
 const leftLeg=box(forms.leg,trousers,-4.2,7,0,root);
 const rightLeg=box(forms.leg,trousers,4.2,7,0,root);
 box(forms.shoe,0x363938,-4.2,2,2,root);
 box(forms.shoe,0x363938,4.2,2,2,root);
 return {root,head,leftArm,rightArm,leftLeg,rightLeg};
}
export function updateCivilianRig(r:CivilianRig,
 c:CivilianActor,now:number):void{
 r.root.position.set(c.p.x,0,c.p.y);
 r.root.rotation.set(0,-c.heading,0);
 r.root.scale.set(1,1,1);
 r.leftArm.position.set(-10,19,0);
 r.rightArm.position.set(10,19,0);
 // Reset every animated transform on every sample. In particular a
 // civilian must not retain a walking stride on replay rewind.
 r.leftArm.rotation.set(0,0,0);r.rightArm.rotation.set(0,0,0);
 r.leftLeg.rotation.set(0,0,0);r.rightLeg.rotation.set(0,0,0);
 r.leftLeg.position.set(-4.2,7,0);r.rightLeg.position.set(4.2,7,0);
 r.head.rotation.set(0,0,0);
 const pose=civilianPose(c);
 // Render-only, seed-derived micro-activity: no AI tick, no new meshes.
 // Reset on every sample so scrubbing backwards is fully deterministic.
 if(pose==='idle'||pose==='work'||pose==='seated'){
  r.head.rotation.y=Math.sin(now*.55+c.appearanceSeed*.013)*.11;
 }
 if(pose==='compliant'){
  r.leftArm.position.y=30;r.rightArm.position.y=30;
  r.leftArm.rotation.z=-.55;r.rightArm.rotation.z=.55;
 }else if(pose==='startled'){
  r.leftArm.rotation.z=-.25;r.rightArm.rotation.z=.25;
 }else if(pose==='hide'||pose==='injured'){
  r.root.scale.y=.73;r.leftArm.rotation.z=-.28;
 }else if(pose==='carried'){
  r.root.rotation.z=.72;r.root.position.y=11;
  r.root.scale.set(.88,.88,.88);
  r.leftLeg.rotation.x=.50;r.rightLeg.rotation.x=.50;
 }else if(pose==='dragged'){
  r.root.rotation.z=Math.PI*.47;r.root.position.y=3;
  r.root.scale.set(.88,.78,.88);
 }else if(pose==='down'){
  r.root.rotation.z=Math.PI*.48;
  r.root.position.y=3;r.root.scale.set(.88,.88,.88);
 }else if(pose==='injured-walk'){
  const step=Math.sin(now*5+c.appearanceSeed*.01)*.17;
  r.root.scale.y=.82;
  r.leftLeg.rotation.x=step;r.rightLeg.rotation.x=-step;
  r.leftArm.rotation.z=-.20;r.rightArm.rotation.x=step*.45;
 }else if(pose==='seated'){
  // Small, blocky and grounded: legs point forward and the upper body
  // is lowered, with no extra joints at phone gameplay scale.
  r.root.scale.y=.73;
  r.leftLeg.rotation.x=.85;r.rightLeg.rotation.x=.85;
  r.leftArm.rotation.x=-.18;r.rightArm.rotation.x=-.18;
 }else if(pose==='work'){
  const task=Math.sin(now*1.8+c.appearanceSeed*.01)*.13;
  r.leftArm.rotation.x=-.24+task;
  r.rightArm.rotation.x=-.24-task;
 }else if(pose==='walk'||pose==='run'){
  const gait=Math.sin(now*(pose==='run'?14:8)+
    c.appearanceSeed*.01)*.32;
  r.leftLeg.rotation.x=gait;r.rightLeg.rotation.x=-gait;
  r.leftArm.rotation.x=-gait*.65;r.rightArm.rotation.x=gait*.65;
 }
}
