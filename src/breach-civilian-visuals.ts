/** Low-cost adult civilian silhouettes. Render-only geometry and poses:
 * never alter fixed-tick movement, civilian collision, visibility or combat.
 * A model with real leg/arm length is preferable to scaling a squat model.
 */
import * as THREE from 'three';
import type {CivilianActor} from './breach-civilian-types.ts';
import {civilianPose} from './breach-civilian-pose.ts';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import {initialWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import {initialEquipmentLoadout,type EquipmentLoadout} from './equipment-loadouts.ts';

/** Operator heads top out around 44 world units. Use comparable civilian
 * anatomy rather than globally enlarging a 36-unit, short-legged puppet.
 * The articulated limbs pivot at SHOULDER and HIP, not their midpoint.
 */
export const CIVILIAN_VISUAL_SCALE=1;
export const CIVILIAN_ANATOMY=Object.freeze({
  torsoY:27.5,headY:40,shoulderY:34.5,hipY:21.2,
  armLength:16.5,legLength:19,shoeOffset:19.2,
  standingHeadTop:44.25
});
const forms={
 torso:new THREE.BoxGeometry(15,15,9),
 coat:new THREE.BoxGeometry(17,17,10),
 head:new THREE.BoxGeometry(8.5,8.5,8.5),
 neck:new THREE.BoxGeometry(3.9,3.1,3.9),
 // Translate vertices, not the articulated mesh pivot.
 arm:new THREE.BoxGeometry(4.2,CIVILIAN_ANATOMY.armLength,4.8)
   .translate(0,-CIVILIAN_ANATOMY.armLength/2,0),
 hand:new THREE.BoxGeometry(3.8,3.6,4.1),
 leg:new THREE.BoxGeometry(5.7,CIVILIAN_ANATOMY.legLength,6.4)
   .translate(0,-CIVILIAN_ANATOMY.legLength/2,0),
 shoe:new THREE.BoxGeometry(7,3.8,8.6),
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
 x:number,y:number,z:number,parent:THREE.Object3D):THREE.Mesh{
 const mesh=new THREE.Mesh(geometry,mat(color));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
export type LegacyCivilianRig={
 root:THREE.Group;upper:THREE.Group;torso:THREE.Mesh;head:THREE.Mesh;
 leftArm:THREE.Mesh;rightArm:THREE.Mesh;
 leftLeg:THREE.Mesh;rightLeg:THREE.Mesh;
 leftShoe:THREE.Mesh;rightShoe:THREE.Mesh;
};
/** One real operator skeleton and appearance/IK animation system, equipped
 * with an intentionally empty civilian wardrobe. The old cheap rig remains
 * available ONLY to old replay/laboratory compatibility callers.
 * Production 3D explicitly requests the shared model.
 */
export type UnifiedCivilianRig={
 root:THREE.Group;character:OperatorRig;wardrobe:WardrobeOptions;
 equipment:EquipmentLoadout;lastTime:number;
};
export type CivilianRig=LegacyCivilianRig|UnifiedCivilianRig;

export function civilianSharedWardrobe(c:CivilianActor):WardrobeOptions{
 const seed=c.appearanceSeed>>>0,wardrobe=initialWardrobe();
 const shirts=['t-shirt','polo-shirt','button-up-shirt','tank-top'];
 wardrobe.styles={
  headwear:'bare',facewear:'face-none',eyewear:'eyes-none',
  top:c.role==='employee'?'polo-shirt':shirts[seed%shirts.length],
  trousers:'bdu-trousers',footwear:'field-boots',
  armorStyle:'armor-bare',rigStyle:'no-rig',beltStyle:'no-belt',
  packStyle:'no-pack',gloves:'gloves-none',knees:'knee-none',wrist:'wrist-none'
 };
 wardrobe.trouserHem='unbloused';
 return wardrobe;
}
export function civilianSharedEquipment():EquipmentLoadout{
 const base=initialEquipmentLoadout();
 return {version:1,slots:{...base.slots,
  head:'head-none',armor:'armor-none',rig:'rig-none',
  belt:'belt-none',backpack:'backpack-none',top:'top-light',
  legs:'legs-light',hands:'hands-none',feet:'feet-light',
  medical:'medical-none',tactical:'tactical-none',utility:'utility-none'}};
}
export function createCivilianRig(c:CivilianActor,useSharedCharacter=false):CivilianRig{
 if(useSharedCharacter){
  const character=createOperatorRig('civilian-'+c.id,'blue',true);
  character.root.name='civilian-'+c.id;
  character.root.userData.civilianSharedCharacter=true;
  return {root:character.root,character,wardrobe:civilianSharedWardrobe(c),
    equipment:civilianSharedEquipment(),lastTime:-1};
 }
 const seed=c.appearanceSeed>>>0,root=new THREE.Group(),upper=new THREE.Group();
 root.name='civilian-'+c.id;
 root.add(upper);
 const jacket=cloth[seed%cloth.length],trousers=pants[(seed>>>3)%pants.length];
 const face=skin[(seed>>>5)%skin.length];
 const outer=c.role==='employee'&&seed%3===0?forms.coat:forms.torso;
 const torso=box(outer,jacket,0,CIVILIAN_ANATOMY.torsoY,0,upper);
 box(forms.neck,face,0,35.6,0,upper);
 if(c.role==='employee'&&seed%4===1)
  box(forms.apron,trousers,0,25,-5.5,upper);
 const head=box(forms.head,face,0,CIVILIAN_ANATOMY.headY,0,upper);
 const leftArm=box(forms.arm,jacket,-9.8,CIVILIAN_ANATOMY.shoulderY,0,upper);
 const rightArm=box(forms.arm,jacket,9.8,CIVILIAN_ANATOMY.shoulderY,0,upper);
 // Hand and boot remain mechanically attached during gait/compliance.
 box(forms.hand,face,0,-CIVILIAN_ANATOMY.armLength-.4,0,leftArm);
 box(forms.hand,face,0,-CIVILIAN_ANATOMY.armLength-.4,0,rightArm);
 const leftLeg=box(forms.leg,trousers,-4.15,CIVILIAN_ANATOMY.hipY,0,root);
 const rightLeg=box(forms.leg,trousers,4.15,CIVILIAN_ANATOMY.hipY,0,root);
 const leftShoe=box(forms.shoe,0x363938,0,-CIVILIAN_ANATOMY.shoeOffset,2,leftLeg);
 const rightShoe=box(forms.shoe,0x363938,0,-CIVILIAN_ANATOMY.shoeOffset,2,rightLeg);
 return {root,upper,torso,head,leftArm,rightArm,leftLeg,rightLeg,
   leftShoe,rightShoe};
}
/** The live shared model is driven by the SAME poseOperator frame as armed
 * actors. Only civilian state->presentation intent is adapted; simulation
 * movement, damage, sight, rescue and replay data are untouched.
 */
function updateSharedCivilianRig(r:UnifiedCivilianRig,c:CivilianActor,now:number){
 const pose=civilianPose(c);
 const down=pose==='down'||pose==='carried'||pose==='dragged';
 const moving=pose==='walk'||pose==='run'||pose==='injured-walk';
 const injured=pose==='injured'||pose==='injured-walk';
 const squat=pose==='hide'||pose==='seated';
 poseOperator(r.character,{
  x:c.p.x,z:c.p.y,heading:c.heading,velocity:moving?c.velocity:0,
  seconds:now,stride:moving?Math.max(.05,c.velocity/53):0,
  posture:squat?'crouch':'stand',
  injury:injured?1:down?3:0,weapon:'carbine',
  reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down,surrender:pose==='compliant',aiming:false,firing:false,
  turning:0,deterministic:true,unarmedPreview:true,
  appearanceSeed:c.appearanceSeed,equipment:r.equipment,
  wardrobe:r.wardrobe,gait:pose==='run'?'run':'walk',
  downProgress:down||pose==='compliant'?1:0,
  poseDiagnostics:false
 },r.lastTime>=0&&now>=r.lastTime?Math.min(.08,now-r.lastTime):0);
 // The operator skeleton owns gait, planted feet, full-body crouching,
 // hands-up compliance and fall. Keep neutral carrying offset render-only.
 r.root.position.y=pose==='carried'?10:pose==='dragged'?2:0;
 r.lastTime=now;
}
export function disposeCivilianRig(r:CivilianRig):void{
 if('character' in r)r.character.dispose();
}
export function updateCivilianRig(r:CivilianRig,
 c:CivilianActor,now:number):void{
 if('character' in r){
  updateSharedCivilianRig(r,c,now);
  return;
 }
 r.root.position.set(c.p.x,0,c.p.y);
 r.root.rotation.set(0,-c.heading,0);
 r.root.scale.setScalar(CIVILIAN_VISUAL_SCALE);
 r.upper.position.set(0,0,0);r.upper.rotation.set(0,0,0);
 r.leftArm.position.set(-9.8,CIVILIAN_ANATOMY.shoulderY,0);
 r.rightArm.position.set(9.8,CIVILIAN_ANATOMY.shoulderY,0);
 // Every replay sample starts from the same neutral articulated anatomy.
 r.leftArm.rotation.set(0,0,0);r.rightArm.rotation.set(0,0,0);
 r.leftLeg.rotation.set(0,0,0);r.rightLeg.rotation.set(0,0,0);
 r.leftLeg.position.set(-4.15,CIVILIAN_ANATOMY.hipY,0);
 r.rightLeg.position.set(4.15,CIVILIAN_ANATOMY.hipY,0);
 r.leftLeg.scale.set(1,1,1);r.rightLeg.scale.set(1,1,1);
 r.leftShoe.scale.set(1,1,1);r.rightShoe.scale.set(1,1,1);
 r.head.rotation.set(0,0,0);
 const pose=civilianPose(c);
 // Hiding and sitting LOWER THE HIPS AND TORSO while keeping feet near
 // ground. Old root.scale.y=.73 artificially truncated every limb and
 // made injured people look like children. Only leg segments compress.
 const bend=(drop:number,legCompression:number)=>{
  r.upper.position.y=-drop;
  const hipY=2+CIVILIAN_ANATOMY.shoeOffset*legCompression;
  r.leftLeg.position.y=hipY;r.rightLeg.position.y=hipY;
  r.leftLeg.scale.y=legCompression;r.rightLeg.scale.y=legCompression;
  r.leftShoe.scale.y=1/legCompression;
  r.rightShoe.scale.y=1/legCompression;
 };
 // Render-only deterministic idle activity, reversible in replay.
 if(pose==='idle'||pose==='work'||pose==='seated')
  r.head.rotation.y=Math.sin(now*.55+c.appearanceSeed*.013)*.11;
 if(pose==='compliant'){
  // Arms pivot from the actual shoulders. Hands end above the head,
  // unlike the former shoulderless centered-arm translation.
  r.leftArm.rotation.z=-2.35;r.rightArm.rotation.z=2.35;
 }else if(pose==='startled'){
  r.leftArm.rotation.z=-.43;r.rightArm.rotation.z=.43;
 }else if(pose==='hide'){
  bend(6.4,.69);
  r.leftLeg.position.x=-5.1;r.rightLeg.position.x=5.1;
  r.leftArm.rotation.z=-.25;r.rightArm.rotation.z=.25;
  r.upper.rotation.x=.08;
 }else if(pose==='injured'){
  // A wounded adult remains adult-height; pain changes the gesture.
  r.upper.rotation.z=-.045;
  r.leftArm.rotation.x=-.42;r.leftArm.rotation.z=-.22;
 }else if(pose==='carried'){
  r.root.rotation.z=.72;r.root.position.y=11;
  r.leftLeg.rotation.x=.50;r.rightLeg.rotation.x=.50;
 }else if(pose==='dragged'){
  r.root.rotation.z=Math.PI*.47;r.root.position.y=3;
 }else if(pose==='down'){
  r.root.rotation.z=Math.PI*.48;r.root.position.y=3;
 }else if(pose==='injured-walk'){
  const step=Math.sin(now*5+c.appearanceSeed*.01)*.17;
  r.leftLeg.rotation.x=step;r.rightLeg.rotation.x=-step;
  r.upper.rotation.z=-.035;
  r.leftArm.rotation.z=-.20;r.rightArm.rotation.x=step*.45;
 }else if(pose==='seated'){
  bend(9,.62);
  r.leftLeg.rotation.x=.48;r.rightLeg.rotation.x=.48;
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
