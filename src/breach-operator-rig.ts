/** 109–113. Deliberately simple box anatomy and independently articulated limbs.
 * The battle motor remains authoritative. IK is presentation-only. */
import * as THREE from 'three';
import {alignSegment,twoBoneJoint} from './breach-ik.ts';
import type {WeaponId} from './breach-combat.ts';
import {constrainFoot,needsRecoveryStep} from './breach-gait.ts';
import {weaponGrips,handlingPose,clampReach} from './breach-weapon-pose.ts';
type Foot={upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;
  anchor:THREE.Vector3;planted:boolean;lastCycle:number;
  swingStart:THREE.Vector3;swingGoal:THREE.Vector3;swinging:boolean;
  swingTime:number;lastPlacement:number};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh};
export type OperatorPose={
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  reload:number;reloadDuration:number;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};down:boolean;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
  obstruction?:boolean;friendlyNear?:boolean;
  aimBlend?:number;recoil?:number;shotHeading?:number;
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
  hip.position.y=19;
  block(hip,0,0,0,8,5,12,cloth);
  chest.position.y=26;
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
      planted:false,lastCycle:-1,swingStart:new THREE.Vector3(),
      swingGoal:new THREE.Vector3(),swinging:false,
      swingTime:0,lastPlacement:-10});
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
  // Stock, comb and narrow sight rail share the weapon's rigid transform.
  block(weapon,-10,0,0,9,3,3.5,boot);
  block(weapon,-1,2.6,0,11,1.2,1.5,steel);
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
    for(const foot of r.feet){foot.planted=false;foot.lastCycle=-1;
      foot.swinging=false;foot.swingTime=0;}
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
  r.chest.rotation.z=clamp(-moving*.025+braking*.018,-.06,.06);
  r.chest.rotation.x=clamp(p.injury===2?.07:p.injury===1?.025:0,0,.09);
  const crouch=p.posture==='crouch'?8:0;
  r.hip.position.y=19-crouch+(p.down?0:Math.sin(p.stride*.18)*moving*.23);
  r.chest.position.y=26-crouch;
  // The planted foot has a limited support envelope around its hip.
  // Reach and crossing constraints are evaluated every render step, not
  // just when the distance-driven swing phase happens to change.
  const headingYaw=r.root.rotation.y;
  const rotateRoot=(v:THREE.Vector3)=>v.applyAxisAngle(P(0,1,0),headingYaw);
  const travelLocal=rotateRoot(P(1,0,0));
  for(let i=0;i<2;i++){
    const foot=r.feet[i],sign=i===0?-1:1;
    const hipLocal=P(0,r.hip.position.y,sign*4.8);
    const neutral=rotateRoot(P(0,1.45,sign*5.6))
      .add(P(p.x,0,p.z));
    if(!foot.planted){
      foot.anchor.copy(neutral);foot.planted=true;
      foot.swinging=false;foot.lastPlacement=p.seconds;
    }
    const isMoving=moving>.12&&!p.down;
    const anchored=constrainFoot({x:foot.anchor.x,y:foot.anchor.z},
      {x:p.x,y:p.z},-headingYaw,sign);
    const mustStep=isMoving&&needsRecoveryStep(anchored,p.velocity>8)||
      (isMoving&&Math.hypot(p.x-foot.anchor.x,p.z-foot.anchor.z)>13.5);
    const urgency=anchored.outOfBounds||Math.hypot(
      p.x-foot.anchor.x,p.z-foot.anchor.z)>16;
    if(!foot.swinging&&mustStep&&
      (p.seconds-foot.lastPlacement>.10||urgency)){
      // A supporting leg normally stays planted while the other swings.
      // Emergency recovery overrides that rule before the hip outruns it.
      const other=r.feet[1-i];
      if(!other.swinging||urgency){
        foot.swinging=true;foot.swingTime=0;
        foot.swingStart.copy(foot.anchor);
        foot.swingGoal.copy(neutral).addScaledVector(travelLocal,
          Math.min(4,3*moving));
        foot.lastPlacement=p.seconds;
      }
    }
    const targetWorld=foot.anchor.clone();
    if(foot.swinging){
      foot.swingTime=Math.min(1,foot.swingTime+dt/(p.injury===2?.30:.18));
      const t=foot.swingTime,ease=t*t*(3-2*t);
      targetWorld.lerpVectors(foot.swingStart,foot.swingGoal,ease);
      targetWorld.y+=Math.sin(Math.PI*t)*Math.min(4.2,2.8+moving);
      if(t>=1){
        foot.anchor.copy(foot.swingGoal);
        foot.swinging=false;
      }
    }else if(anchored.outOfBounds){
      // Keep the body supported even on replay seeks or sharp rotations.
      foot.anchor.x=anchored.position.x;
      foot.anchor.z=anchored.position.y;
      targetWorld.copy(foot.anchor);
    }
    const relative=targetWorld.sub(P(p.x,0,p.z))
      .applyAxisAngle(P(0,1,0),-headingYaw);
    // The solver must never swap knees or fold the foot across the pelvis.
    relative.z=sign*Math.max(3.5,Math.abs(relative.z));
    relative.x=clamp(relative.x,-8.8,8.8);
    const knee=twoBoneJoint(hipLocal,relative,9.7,9.7,
      P(3.5,0,sign*1.2));
    alignSegment(foot.upper,hipLocal,knee);
    alignSegment(foot.lower,knee,relative);
    foot.shoe.position.copy(relative);
  }
  // 116: weapon is solved from stock-to-shoulder contact FIRST, then two
  // arm chains conform to their physical grips. It is always one rigid body.
  const data=weaponGrips(p.weapon);
  const handling=handlingPose({
    aim:p.aimBlend??(p.aiming?1:0),moving,
    obstruction:!!p.obstruction,friendlyNear:!!p.friendlyNear
  });
  r.weapon.scale.x=data.lengthScale;
  const stock=P(data.stockX*data.lengthScale,0,0);
  const shoulderPocket=P(2.5,
    handling==='ads'?8:handling==='point'?5.3:
    handling==='high'?6:handling==='short'?4:2.5,4.2);
  const recoil=p.recoil??(p.firing?1.5:0);
  // This yaw is determined by the authoritative firing direction.
  r.weapon.rotation.y=-(p.shotHeading??p.heading)-
    r.root.rotation.y-r.chest.rotation.y;
  r.weapon.rotation.z=handling==='low'?-.16:handling==='high'?.13:0;
  if(handling==='short')r.weapon.rotation.z=-.08;
  const aimedStock=stock.clone().applyAxisAngle(P(0,1,0),
    r.weapon.rotation.y);
  r.weapon.position.copy(shoulderPocket).sub(aimedStock);
  r.weapon.position.x-=recoil;
  r.weapon.position.y+=Math.min(1.1,recoil*.20);
  // A physical door reach may shift the chest a little over the support
  // foot, but the whole character is never allowed to tip like a rigid pole.
  const reloadProgress=p.reload>0?1-p.reload/p.reloadDuration:0;
  const reloadActive=p.reload>0;
  const throwAge=p.seconds-p.lastThrowAt;
  const throwActive=throwAge>=0&&throwAge<.70;
  const doorAge=p.seconds-p.lastDoorAt;
  const doorActive=doorAge>=0&&doorAge<.9&&!!p.doorPoint;
  r.chest.position.x=0;
  const leftGrip=P(data.supportX,data.supportY,-1.6);
  const rightGrip=P(data.primaryX,data.primaryY,1.8);
  let reaching=false;
  if(reloadActive){
    leftGrip.set(data.primaryX-1,-7,-5*Math.sin(Math.PI*reloadProgress)-2);
  }else if(throwActive){
    const t=Math.sin(Math.PI*clamp(throwAge/.7,0,1));
    leftGrip.set(data.supportX+8*t,4+7*t,-7);
  }else if(doorActive&&p.doorPoint){
    reaching=true;
    const local=P(p.doorPoint.x-p.x,19-r.chest.position.y,
      p.doorPoint.y-p.z);
    local.applyAxisAngle(P(0,1,0),-r.root.rotation.y);
    local.applyAxisAngle(P(0,1,0),-r.chest.rotation.y);
    // Small shoulder/chest reach rather than arm stretching.
    r.chest.position.x=clamp(local.x-13,0,2.4);
    leftGrip.copy(local).sub(P(r.chest.position.x,0,0));
  }
  for(let i=0;i<2;i++){
    const sign=i===0?-1:1,arm=r.arms[i];
    const shoulder=P(1,4,sign*7);
    const grip=i===0?leftGrip:rightGrip;
    const desired=i===0&&reaching?grip.clone():
      grip.clone().multiply(P(data.lengthScale,1,1))
        .applyAxisAngle(P(0,1,0),r.weapon.rotation.y)
        .add(r.weapon.position);
    // Hard reach limit applies to door handles, weapon handling and reloads.
    // Never let a long IK target stretch the physical arm to meet it.
    const wrist=clampReach(shoulder,desired,19.2);
    const elbow=twoBoneJoint(shoulder,wrist,10,10,P(-.2,-.4,sign*2));
    alignSegment(arm.upper,shoulder,elbow);
    alignSegment(arm.lower,elbow,wrist);
    arm.hand.position.copy(wrist);
  }
  if(p.down){
    r.root.rotation.z=0;r.chest.rotation.x=-.4;
  }else if(p.surrender){
    r.root.rotation.z=.13;r.chest.rotation.x=.25;
  }else r.root.rotation.z=clamp(p.injury===2?.065:p.injury===1?.018:0,0,.08);
  r.lastPose={...p};r.lastTime=p.seconds;
}
