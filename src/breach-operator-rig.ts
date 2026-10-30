/** 109–113. Deliberately simple box anatomy and independently articulated limbs.
 * The battle motor remains authoritative. IK is presentation-only. */
import * as THREE from 'three';
import {alignSegment,twoBoneJoint} from './breach-ik.ts';
import type {WeaponId} from './breach-combat.ts';
type Foot={upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;
  anchor:THREE.Vector3;planted:boolean;lastCycle:number};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh};
export type OperatorPose={
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  reload:number;reloadDuration:number;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};down:boolean;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
};
export type OperatorRig={
  root:THREE.Group;hip:THREE.Group;chest:THREE.Group;head:THREE.Group;
  weapon:THREE.Group;feet:Foot[];arms:Arm[];
  legacyLegs:THREE.Group[];legacyArms:THREE.Group[];
  pack:THREE.Mesh;lastTime:number;lastPose:OperatorPose|null;
  stridePhase:number;dispose:()=>void;
};
const mat=(hex:number)=>new THREE.MeshStandardMaterial({color:hex,
  flatShading:true,roughness:.86});
function block(group:THREE.Group,x:number,y:number,z:number,
  width:number,height:number,depth:number,material:THREE.Material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);return mesh;
}
function bone(parent:THREE.Group,w:number,depth:number,m:THREE.Material){
  const mesh=block(parent,0,0,0,w,1,depth,m);
  return mesh;
}
export function createOperatorRig(id:string,side:'blue'|'red'):OperatorRig{
  const root=new THREE.Group(),hip=new THREE.Group(),chest=new THREE.Group(),
    head=new THREE.Group(),weapon=new THREE.Group();
  root.add(hip,chest);chest.add(head,weapon);
  const cloth=mat(side==='red'?0x936e5b:
    id==='moss'?0x80826b:id==='ash'?0x8e846e:
    id==='vale'?0x687c8d:0x6f9185);
  const boot=mat(0x313935),vest=mat(0x43504b),
    skin=mat(0xb29b83),steel=mat(0x414846);
  hip.position.y=13.5;
  block(hip,0,0,0,8,5,12,cloth);
  chest.position.y=23;
  block(chest,0,0,0,10,12,14,cloth);
  block(chest,3,0,0,2.8,9,13,vest);
  block(chest,-3,1,0,2,8,11,vest);
  const pack=block(chest,-7,0,0,6,11,11,vest);
  head.position.y=10;
  block(head,0,-3,0,3.6,4,3.8,skin);
  block(head,0,3,0,8,8,8,skin);
  block(head,0,6,0,9.4,3.5,9.4,vest);
  block(head,4,3,0,2,2.7,8,vest);
  const feet:Foot[]=[],arms:Arm[]=[];
  for(const sideSign of [-1,1]){
    const upper=bone(root,4.7,5.3,cloth),lower=bone(root,4,4.3,cloth);
    const shoe=block(root,0,0,0,8,2.9,5.8,boot);
    feet.push({upper,lower,shoe,anchor:new THREE.Vector3(),
      planted:false,lastCycle:-1});
    const armUpper=bone(chest,3.9,4.0,cloth);
    const armLower=bone(chest,3.4,3.5,cloth);
    const hand=block(chest,0,0,0,3.6,3.2,3.9,skin);
    arms.push({upper:armUpper,lower:armLower,hand});
    void sideSign;
  }
  weapon.position.set(8,-5,0);
  block(weapon,1,0,0,14,3,3.5,steel);
  block(weapon,13,0,0,13,2.4,2.7,steel);
  block(weapon,-6,-1,0,6,4,3,boot);
  block(weapon,3,-4,0,2.7,6,2.5,boot);
  return {root,hip,chest,head,weapon,feet,arms,pack,
    legacyLegs:[new THREE.Group(),new THREE.Group()],
    legacyArms:[new THREE.Group(),new THREE.Group()],
    lastTime:-1,lastPose:null,stridePhase:0,
    dispose:()=>{root.traverse(obj=>{if(obj instanceof THREE.Mesh){
      obj.geometry.dispose();
      const m=obj.material as THREE.Material;m.dispose();
    }})}};
}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const diff=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function approach(v:number,target:number,rate:number,dt:number){
  return v+clamp(diff(v,target),-rate*dt,rate*dt);
}
const P=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export function poseOperator(r:OperatorRig,p:OperatorPose,dt:number){
  if(dt<0||r.lastTime>p.seconds+.03||p.seconds-r.lastTime>1.2){
    for(const foot of r.feet){foot.planted=false;foot.lastCycle=-1;}
    r.lastTime=p.seconds;dt=0;
  }
  dt=clamp(dt,0,.08);
  const moving=Math.min(1,p.velocity/72);
  const direction=r.lastPose?
    Math.atan2(p.z-r.lastPose.z,p.x-r.lastPose.x):p.heading;
  const travel=moving>.14?direction:p.heading;
  const hipTarget=moving>.22?travel:p.heading;
  r.root.rotation.y=approach(r.root.rotation.y,-hipTarget,3.8,dt);
  // Upper body follows aim, with a limited anatomical twist.
  const torsoDelta=clamp(diff(hipTarget,p.heading),-.68,.68);
  r.chest.rotation.y=approach(r.chest.rotation.y,-torsoDelta,6,dt);
  r.head.rotation.y=clamp(-diff(hipTarget,p.heading)*.38,-.28,.28);
  const braking=r.lastPose?clamp((r.lastPose.velocity-p.velocity)/60,-1,1):0;
  r.chest.rotation.z=clamp(-moving*.075+braking*.055,-.16,.16);
  r.chest.rotation.x=clamp(p.injury===2?.12:p.injury===1?.04:0,0,.2);
  const crouch=p.posture==='crouch'?4:0;
  r.hip.position.y=13.5-crouch+(p.down?0:Math.sin(p.stride*.25)*moving*.42);
  r.chest.position.y=23-crouch;
  const cycle=p.stride/19;
  // World anchors: planted feet stay put as the body passes above them.
  for(let i=0;i<2;i++){
    const foot=r.feet[i],sign=i===0?-1:1,phase=((cycle+i*.5)%1+1)%1;
    const stance=phase<.57||moving<.09;
    const side=sign*4.5;
    const hipLocal=P(0,r.hip.position.y,side);
    const goal=P((phase-.48)*22*moving,1.45,side);
    const rotateRoot=(local:THREE.Vector3)=>local.applyAxisAngle(P(0,1,0),
      r.root.rotation.y);
    if(!foot.planted||(!stance&&foot.lastCycle!==Math.floor(cycle+i*.5))){
      const relative=rotateRoot(goal);
      foot.anchor.set(p.x+relative.x,1.45,p.z+relative.z);
      foot.planted=true;foot.lastCycle=Math.floor(cycle+i*.5);
    }
    const target=foot.anchor.clone().sub(P(p.x,0,p.z))
      .applyAxisAngle(P(0,1,0),-r.root.rotation.y);
    if(!stance){
      target.x+=Math.sin(phase*Math.PI)*3.2*moving;
      target.y+=Math.max(0,Math.sin((phase-.57)/.43*Math.PI))*4.8*moving;
    }
    const knee=twoBoneJoint(hipLocal,target,7.5,7.4,P(1,0,sign*.25));
    alignSegment(foot.upper,hipLocal,knee);
    alignSegment(foot.lower,knee,target);
    foot.shoe.position.copy(target);foot.shoe.rotation.y=0;
  }
  // Shoulder direction, both-hand grips, and support-hand action reach.
  const gunLength=p.weapon==='smg'?.70:p.weapon==='rifle'?1.26:
    p.weapon==='shotgun'?1.12:1;
  const retract=p.aiming?0:.24;
  r.weapon.scale.x=gunLength;
  r.weapon.position.x=8-retract*7;
  r.weapon.position.y=-5+(p.aiming?1:0);
  const reloadProgress=p.reload>0?1-p.reload/p.reloadDuration:0;
  const reloadActive=p.reload>0;
  const throwAge=p.seconds-p.lastThrowAt;
  const throwActive=throwAge>=0&&throwAge<.70;
  const doorAge=p.seconds-p.lastDoorAt;
  const doorActive=doorAge>=0&&doorAge<.9;
  const recoil=p.firing?1.9:0;
  r.weapon.position.x-=recoil;
  r.weapon.rotation.z=reloadActive?.18*Math.sin(Math.PI*reloadProgress):0;
  const leftGrip=P(6,-4,-2),rightGrip=P(1,-4,2);
  if(reloadActive){
    const t=Math.sin(Math.PI*reloadProgress);
    leftGrip.set(1,-10,-6*t-2);
  }else if(throwActive){
    const t=Math.sin(Math.PI*clamp(throwAge/.7,0,1));
    leftGrip.set(10+12*t,3+7*t,-7);
  }else if(doorActive&&p.doorPoint){
    leftGrip.set(7,2,-9);
  }
  for(let i=0;i<2;i++){
    const sign=i===0?-1:1,arm=r.arms[i];
    const shoulder=P(0,3,sign*7);
    const grip=i===0?leftGrip:rightGrip;
    const wrist=grip.clone().add(r.weapon.position);
    const elbow=twoBoneJoint(shoulder,wrist,8.8,8.8,
      P(-.4,-.25,sign));
    alignSegment(arm.upper,shoulder,elbow);
    alignSegment(arm.lower,elbow,wrist);
    arm.hand.position.copy(wrist);
  }
  if(p.down){
    r.root.rotation.z=-1.24;r.chest.rotation.x=-.4;
  }else if(p.surrender){
    r.root.rotation.z=.13;r.chest.rotation.x=.25;
  }else r.root.rotation.z=clamp(p.injury===2?.14:p.injury===1?.04:0,0,.18);
  r.lastPose={...p};r.lastTime=p.seconds;
}
