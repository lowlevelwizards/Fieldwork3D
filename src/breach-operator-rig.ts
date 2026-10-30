/** 109–113. Deliberately simple box anatomy and independently articulated limbs.
 * The battle motor remains authoritative. IK is presentation-only. */
import * as THREE from 'three';
import {alignSegment,solveTwoBone,ARM_LIMITS,LEG_LIMITS,
  intersectsTorso} from './breach-ik.ts';
import type {WeaponId} from './breach-combat.ts';
import {advanceFootsteps,createFootstepScheduler, type FootstepScheduler} from './breach-footsteps.ts';
import type {ReplayFeet} from './breach-replay-motion.ts';
import {bodyFromContacts} from './breach-body-motion.ts';
import {fallAngles,hitStagger,type FallPose,type WoundRegion}
  from './breach-wounds.ts';
import {weaponGrips,handlingPose,clampReach,
  fitWeaponPose} from './breach-weapon-pose.ts';
type Foot={upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;
  ankleLink:THREE.Mesh;
  anchor:THREE.Vector3;swinging:boolean;
  bend:THREE.Vector3;outOfReach:boolean};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh;
  bend:THREE.Vector3;outOfReach:boolean};
export type OperatorPose={
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  /** Authoritative travel direction; optional until motion sampling is wired. */
  travelYaw?:number;
  /** Render-only reconstructed feet and pose: no accumulated render state. */
  replayFeet?:ReplayFeet;deterministic?:boolean;pelvisYaw?:number;
  reload:number;reloadDuration:number;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};down:boolean;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
  obstruction?:boolean;friendlyNear?:boolean;
  aimBlend?:number;recoil?:number;shotHeading?:number;
  hitFade?:number;hitAge?:number;downProgress?:number;flashActive?:boolean;
  hitRegion?:WoundRegion;hitYaw?:number;hitSeverity?:number;
  downPose?:FallPose;
};
export type OperatorRig={
  root:THREE.Group;hip:THREE.Group;chest:THREE.Group;head:THREE.Group;
  weapon:THREE.Group;feet:Foot[];arms:Arm[];
  legacyLegs:THREE.Group[];legacyArms:THREE.Group[];
  pack:THREE.Mesh;lastTime:number;lastPose:OperatorPose|null;
  footsteps:FootstepScheduler;
  /** Non-authoritative request for the motor/controller to reposition. */
  reachRequest:null|{kind:'door';distance:number};
  gripError:number;legGap:[number,number];
  stridePhase:number;colors:Map<THREE.MeshStandardMaterial,THREE.Color>;
  dispose:()=>void;
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
    const ankleLink=bone(root,3.8,3.8,boot);
    ankleLink.visible=false;
    feet.push({upper,lower,shoe,ankleLink,
      anchor:new THREE.Vector3(),
      swinging:false,bend:new THREE.Vector3(1,0,0),outOfReach:false});
    const armUpper=bone(chest,3.9,4.0,cloth);
    const armLower=bone(chest,3.4,3.5,cloth);
    const hand=block(chest,0,0,0,3.6,3.2,3.9,skin);
    arms.push({upper:armUpper,lower:armLower,hand,
      bend:new THREE.Vector3(5,-2,sideSign*7),outOfReach:false});
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
  const colors=new Map([cloth,boot,vest,skin,steel].map(material=>
    [material,material.color.clone()] as const));
  return {root,hip,chest,head,weapon,feet,arms,pack,colors,
    legacyLegs:[new THREE.Group(),new THREE.Group()],
    legacyArms:[new THREE.Group(),new THREE.Group()],
    lastTime:-1,lastPose:null,stridePhase:0,
    footsteps:createFootstepScheduler(),reachRequest:null,
    gripError:0,legGap:[0,0],
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
    r.lastTime=p.seconds;dt=0;
  }
  dt=clamp(dt,0,.08);
  // Retain costume identity, but subdued incapacitated bodies blend with
  // grounded blood and don't need floating status text. Reversible on seek.
  for(const [material,original] of r.colors){
    material.color.copy(original);
    if(p.down&&!p.surrender)material.color.lerp(new THREE.Color(0x555c57),.46);
  }
  const moving=p.down?0:Math.min(1,p.velocity/72);
  const direction=p.travelYaw??(r.lastPose?
    Math.atan2(p.z-r.lastPose.z,p.x-r.lastPose.x):p.heading);
  const travel=moving>.14?direction:p.heading;
  // Tactical strafing and reverse movement keep the pelvis oriented toward
  // the threat; translation is not the same thing as facing.
  const lateral=Math.abs(Math.sin(travel-p.heading))>.52;
  const reverse=Math.cos(travel-p.heading)<-.4;
  const hipTarget=moving>.22&&!lateral&&!reverse?travel:p.heading;
  r.root.rotation.y=p.deterministic?-hipTarget:
    approach(r.root.rotation.y,-hipTarget,3.8,dt);
  // Upper body follows aim, with a limited anatomical twist.
  const torsoDelta=clamp(diff(hipTarget,p.heading),-.68,.68);
  r.chest.rotation.y=p.deterministic?-torsoDelta:
    approach(r.chest.rotation.y,-torsoDelta,6,dt);
  r.head.rotation.y=clamp(-diff(hipTarget,p.heading)*.38,-.28,.28);
  const braking=!p.deterministic&&r.lastPose?
    clamp((r.lastPose.velocity-p.velocity)/60,-1,1):0;
  r.chest.rotation.z=clamp(-moving*.025+braking*.018,-.06,.06);
  r.chest.rotation.x=clamp(p.injury===2?.07:p.injury===1?.025:0,0,.09);
  const crouch=p.posture==='crouch'?8:0;
  r.hip.position.y=19-crouch;
  r.chest.position.y=26-crouch;
  // Build 119: the footstep scheduler owns world contacts. The IK renderer
  // consumes its targets but must never relocate a planted anchor.
  let headingYaw=r.root.rotation.y;
  const travelYaw=p.travelYaw??direction;
  const targets=p.replayFeet??advanceFootsteps(r.footsteps,{
    time:p.seconds,position:{x:p.x,y:p.z},rootYaw:-p.heading,
    travelYaw,facingYaw:p.heading,speed:p.velocity,turning:p.turning,
    posture:p.posture,injury:p.injury,down:p.down,
    cautious:p.aiming&&moving<.35
  });
  // A pivot requires the stance to catch up with requested facing.
  // In replay/lab this orientation is reconstructed by time, never dt.
  if(p.pelvisYaw!==undefined){
    r.root.rotation.y=p.pelvisYaw;
  }else if(r.footsteps.mode==='pivot'){
    r.root.rotation.y=r.footsteps.pelvisYaw;
  }
  headingYaw=r.root.rotation.y;
  const lookTwist=clamp(-p.heading-headingYaw,-.68,.68);
  if(r.footsteps.mode==='pivot'||p.pelvisYaw!==undefined){
    r.chest.rotation.y=p.deterministic?lookTwist:
      approach(r.chest.rotation.y,lookTwist,6,dt);
  }
  const motion=bodyFromContacts({velocity:p.down?0:p.velocity,
    heading:p.heading,travelYaw,turning:p.turning,
    injury:p.injury,posture:p.posture,feet:targets});
  // Wide side-steps need a physical lowering of the center of mass,
  // not a longer limb or a shoe teleported away from its world anchor.
  const stanceRadius=Math.max(...targets.map(t=>
    Math.hypot(t.position.x-p.x,t.position.y-p.z)));
  const stanceDrop=clamp((stanceRadius-7.8)*.80,0,4.0);
  r.hip.position.y=Math.max(17.12-crouch,19-crouch+motion.pelvisY-stanceDrop);
  r.hip.position.z=motion.pelvisSide;
  r.chest.position.y=26-crouch+motion.pelvisY*.65;
  r.chest.position.z=motion.pelvisSide*.75;
  r.chest.rotation.z=motion.torsoForward+braking*.018;
  r.chest.rotation.x=clamp(p.injury===2?.07:p.injury===1?.025:0,0,.09)+
    motion.torsoSide;
  r.chest.rotation.y+=motion.torsoYaw;
  r.head.rotation.x=motion.headCounter;
  for(let i=0;i<2;i++){
    const foot=r.feet[i],sign=i===0?-1:1,target=targets[i];
    const hipLocal=P(0,r.hip.position.y,r.hip.position.z+sign*4.8);
    const anchor=p.replayFeet?target.position:
      r.footsteps.feet[i].plantedAt;
    foot.anchor.set(anchor.x,1.45,anchor.y);
    // Replay seeks must never inherit a pole fallback from another time.
    if(p.deterministic)foot.bend.set(1,0,0);
    foot.swinging=!target.contact;
    const targetWorld=P(target.position.x,1.45+target.height,
      target.position.y);
    const relative=targetWorld.sub(P(p.x,0,p.z))
      .applyAxisAngle(P(0,1,0),-headingYaw);
    const leg=solveTwoBone(hipLocal,relative,9.7,9.7,
      P(4.5,0,sign*1.1),LEG_LIMITS,foot.bend);
    foot.bend.copy(leg.bendPlane);
    foot.outOfReach=!leg.reached;
    // The boot follows the scheduled contact, so report the anatomical
    // ankle separation for tuning rather than silently hiding it.
    r.legGap[i]=leg.effector.distanceTo(relative);
    // Contact remains in world space. Unreachable limbs report a constraint
    // violation instead of spinning the knee or teleporting their boot.
    alignSegment(foot.upper,hipLocal,leg.joint,P(0,0,sign));
    alignSegment(foot.lower,leg.joint,leg.effector,P(0,0,sign));
    // Final small reach extension is represented by a boot-colored
    // articulated ankle cuff, never a floating shoe or stretched shin.
    // The original two-bone segment lengths remain unchanged.
    foot.ankleLink.visible=r.legGap[i]>.10;
    if(foot.ankleLink.visible)
      alignSegment(foot.ankleLink,leg.effector,relative,P(0,0,sign));
    foot.shoe.position.copy(relative);
    const pitch=target.pitch??0;
    foot.shoe.rotation.z=pitch;
    // The shoe's world-space anchor remains authoritative even while its
    // visual box rocks around the local center.
    // A boot rotates only during its scheduled swing, not with the pelvis.
    foot.shoe.rotation.y=target.worldYaw-headingYaw;
  }
  // Build 120: stock, both grips and forearm targets share a single rigid
  // firearm transform. The fit searches reachable posture before limb IK.
  const data=weaponGrips(p.weapon);
  const handling=handlingPose({
    aim:p.aimBlend??(p.aiming?1:0),moving,
    obstruction:!!p.obstruction,friendlyNear:!!p.friendlyNear
  });
  const recoil=p.recoil??(p.firing?1.5:0);
  const fit=fitWeaponPose({weapon:p.weapon,handling,
    yaw:-(p.shotHeading??p.heading)-r.root.rotation.y-r.chest.rotation.y,
    recoil,aimBlend:p.aimBlend??(p.aiming?1:0)});
  r.gripError=fit.contactError;
  // Contact coordinates and visible weapon use one rigid transform.
  r.weapon.scale.set(data.lengthScale,1,1);
  r.weapon.rotation.copy(fit.rotation);
  r.weapon.position.copy(fit.origin);
  // Weapon kick and muzzle flash may not break solved hand contacts.
  // A physical door reach may shift the chest a little over the support
  // foot, but the whole character is never allowed to tip like a rigid pole.
  const reloadProgress=p.reload>0?1-p.reload/p.reloadDuration:0;
  const reloadActive=p.reload>0;
  const throwAge=p.seconds-p.lastThrowAt;
  const throwActive=throwAge>=0&&throwAge<.70;
  const doorAge=p.seconds-p.lastDoorAt;
  const doorActive=doorAge>=0&&doorAge<.9&&!!p.doorPoint;
  r.chest.position.x=0;
  r.reachRequest=null;
  r.weapon.visible=!p.surrender;
  const leftGrip=P(data.supportX,data.supportY,-1.6);
  const rightGrip=P(data.primaryX,data.primaryY,1.8);
  let reaching=false,releaseLeft=false;
  if(reloadActive){
    releaseLeft=true;
    leftGrip.set(data.primaryX-1,-7,-5*Math.sin(Math.PI*reloadProgress)-2);
  }else if(throwActive){
    releaseLeft=true;
    const t=Math.sin(Math.PI*clamp(throwAge/.7,0,1));
    leftGrip.set(data.supportX+8*t,4+7*t,-7);
  }else if(p.surrender){
    releaseLeft=true;
    leftGrip.set(-1,11,-6);rightGrip.set(-1,11,6);
  }else if(!p.down&&p.injury>0&&
    p.hitRegion!=='leg'&&!p.aiming&&!p.firing&&
    p.hitAge!==undefined&&p.hitAge>=0&&p.hitAge<1.1){
    // Only release the support grip to guard a fresh injury when the
    // operator is not actively aiming or already using that hand.
    releaseLeft=true;
    const progress=Math.sin(Math.PI*clamp(p.hitAge/1.1,0,1));
    leftGrip.set(3+progress*2,-5,-5);
  }else if(doorActive&&p.doorPoint){
    releaseLeft=true;reaching=true;
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
    let desired:THREE.Vector3;
    if(p.surrender||i===0&&reaching){
      desired=grip.clone();
    }else if(i===0&&!releaseLeft){
      // Ordinary walking, side shuffles, turning and ADS never release
      // the support hand. Only a deliberate action may move it.
      desired=fit.support.clone();
    }else if(i===1){
      desired=fit.primary.clone();
    }else{
      desired=grip.clone().multiply(P(data.lengthScale,1,1))
        .applyEuler(fit.rotation).add(fit.origin);
    }
    const reachable=desired.distanceTo(shoulder)<=19.92;
    if(i===0&&reaching&&!reachable)
      r.reachRequest={kind:'door',distance:desired.distanceTo(shoulder)};
    // Impossible interactions must report the need for repositioning, not
    // stretch a joint or rotate an arm through the upper torso.
    const wrist=clampReach(shoulder,desired,19.92);
    if(p.deterministic)arm.bend.set(5,-2,sign*7);
    // Tucked elbow corridor: down/forward and near the rib line.
    // The arm should not seek a skyward pole during lateral motion.
    const preferred=P(5,-4,sign*7);
    let solved=solveTwoBone(shoulder,wrist,10,10,
      preferred,ARM_LIMITS,arm.bend);
    if(intersectsTorso(solved.joint,.35)){
      solved=solveTwoBone(shoulder,wrist,10,10,
        P(8,-5,sign*11),ARM_LIMITS,arm.bend);
    }
    arm.bend.copy(solved.bendPlane);
    arm.outOfReach=!reachable||!solved.reached;
    if(!releaseLeft&&i===0)r.gripError=Math.max(r.gripError,
      desired.distanceTo(solved.effector));
    if(i===1&&!p.surrender)r.gripError=Math.max(r.gripError,
      desired.distanceTo(solved.effector));
    alignSegment(arm.upper,shoulder,solved.joint,P(0,0,sign));
    alignSegment(arm.lower,solved.joint,solved.effector,P(0,0,sign));
    arm.hand.position.copy(solved.effector);
    arm.hand.rotation.set(0,p.surrender?0:clamp(fit.rotation.y,-1,1),0);
  }
  // The pose system is the final writer for actor tilts and reactions.
  // The scene controls XY world placement only, not anatomy or weapon pose.
  const downProgress=clamp(p.downProgress??(p.down?1:0),0,1);
  const reaction=hitStagger(p.hitRegion??'torso',
    p.hitYaw??p.heading,p.heading,
    p.hitAge===undefined?100:p.hitAge,p.hitSeverity??1);
  const injuryTilt=p.injury===2?.16:p.injury===1?.05:0;
  const collapse=fallAngles(p.downPose??'forward',downProgress);
  r.root.rotation.x=p.surrender?-.22:
    p.down?collapse.x:-(injuryTilt+reaction.forward);
  r.root.rotation.z=p.surrender?.09:
    p.down?collapse.z:
    clamp(p.injury===2?.065:p.injury===1?.018:0,0,.08)+
      reaction.side;
  r.root.position.y=p.surrender?-4:p.down?collapse.y:0;
  if(p.flashActive&&!p.down)r.root.rotation.z+=.10*Math.sin(p.seconds*24);
  if(p.surrender)r.chest.rotation.x=.15;
  else if(p.down)r.chest.rotation.x=-.05;
  // Wounds do not leave an incapacitated actor standing in the old
  // locomotion/ready pose. Final angles are deterministic from the hit.
  if(p.down){
    r.chest.rotation.y=0;
    r.head.rotation.x=0;
  }
  r.lastPose={...p};r.lastTime=p.seconds;
}
