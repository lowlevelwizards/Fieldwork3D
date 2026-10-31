/** 109–113. Deliberately simple box anatomy and independently articulated limbs.
 * The battle motor remains authoritative. IK is presentation-only. */
import * as THREE from 'three';
import {alignSegment,solveTwoBone,ARM_LIMITS,LEG_LIMITS,
  intersectsTorso} from './breach-ik.ts';
import type {WeaponId} from './breach-combat.ts';
import {advanceFootsteps,createFootstepScheduler,validatedReplayFeet,
  type FootstepScheduler,type FootTarget,type FootstepInput}
  from './breach-footsteps.ts';
import type {ReplayFeet} from './breach-replay-motion.ts';
import {bodyFromContacts} from './breach-body-motion.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,LEG_HIP_SIDE} from './breach-leg-geometry.ts';
import {turnHierarchy} from './breach-turn-hierarchy.ts';
import {contactReaction,type BashRole} from './breach-contact-reactions.ts';
import {kickMotion} from './breach-door-actions.ts';
import {reloadPhase,type ReloadMode} from './breach-magazines.ts';
import {reloadHandKey} from './breach-reload-motion.ts';
import {ANATOMY,elbowCorridor} from './breach-anatomy.ts';
import {handlingProfile,type HandlingProfile} from './breach-handling-profiles.ts';
import {blendedHandlingProfile,smoothHandling,type HandlingTransition}
  from './breach-handling-transition.ts';
import {fallAngles,hitStagger,type FallPose,type WoundRegion}
  from './breach-wounds.ts';
import {weaponGrips,handlingPose,clampReach,
  fitWeaponPose,type Handling,type HandlingIntent}
  from './breach-weapon-pose.ts';
type Foot={upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;
  ankleLink:THREE.Mesh;
  anchor:THREE.Vector3;swinging:boolean;
  bend:THREE.Vector3;outOfReach:boolean;};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh;
  bend:THREE.Vector3;outOfReach:boolean};
export type OperatorPose={
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  /** Authoritative travel direction; optional until motion sampling is wired. */
  travelYaw?:number;
  /** Render-only reconstructed feet and pose: no accumulated render state. */
  replayFeet?:ReplayFeet;deterministic?:boolean;pelvisYaw?:number;
  reload:number;reloadDuration:number;reloadMode?:ReloadMode|null;
  reloadRemoved?:boolean;reloadInserted?:boolean;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};
  doorMethod?:'open'|'close'|'kick'|'hold';down:boolean;
  lastBashAt?:number;bashRole?:BashRole;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
  /** Lab preview only: choose an exact stock/weapon readiness posture. */
  handlingOverride?:Handling;
  handlingIntent?:HandlingIntent;threatRange?:number|null;
  handlingTransition?:HandlingTransition;
  obstruction?:boolean;friendlyNear?:boolean;
  clearanceRetraction?:number;clearanceBlocked?:boolean;
  blocked?:boolean;footAllowed?:(point:{x:number;y:number})=>boolean;
  gait?:'walk'|'run'|'pie'|'squeeze';
  /** Opt-in to contact-position weight transfer for lab candidate only. */
  hybridSupport?:boolean;
  acceleration?:number;
  aimBlend?:number;recoil?:number;shotHeading?:number;
  hitFade?:number;hitAge?:number;downProgress?:number;flashActive?:boolean;
  hitRegion?:WoundRegion;hitYaw?:number;hitSeverity?:number;
  downPose?:FallPose;
};
export type OperatorRig={
  root:THREE.Group;hip:THREE.Group;chest:THREE.Group;head:THREE.Group;
  weapon:THREE.Group;droppedGun:THREE.Group;feet:Foot[];arms:Arm[];
  magazineInserted:THREE.Mesh;magazineHand:THREE.Mesh;
  pack:THREE.Mesh;lastTime:number;lastPose:OperatorPose|null;
  footsteps:FootstepScheduler;
  /** Non-authoritative request for the motor/controller to reposition. */
  reachRequest:null|{kind:'door';distance:number};
  gripError:number;stockError:number;eyeError:number;
  handlingProfile:HandlingProfile|null;
  lastHandling:Handling|null;lastHandlingAt:number;
  autoHandling:(HandlingTransition&{at:number})|null;
  elbowSpread:[number,number];legGap:[number,number];
  colors:Map<THREE.MeshStandardMaterial,THREE.Color>;
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
    head=new THREE.Group(),weapon=new THREE.Group(),droppedGun=new THREE.Group();
  root.add(hip,chest,droppedGun);droppedGun.visible=false;chest.add(head,weapon);
  const cloth=mat(side==='red'?0x936e5b:
    id==='moss'?0x80826b:id==='ash'?0x8e846e:
    id==='vale'?0x687c8d:0x6f9185);
  const boot=mat(0x313935),vest=mat(0x43504b),
    skin=mat(0xb29b83),steel=mat(0x414846);
  hip.position.y=20.2;
  block(hip,0,0,0,8,5,12,cloth);
  chest.position.y=26;
  block(chest,0,0,0,10,12,14,cloth);
  block(chest,3,0,0,2.8,9,13,vest);
  block(chest,-3,1,0,2,8,11,vest);
  // Low-poly padded upper-pec/shoulder contour is the visible buttplate
  // contact. The stock seats into this pad rather than the arm geometry.
  for(const sign of [-1,1])
    block(chest,1.35,4.6,sign*6.05,3.8,3.1,2.0,vest);
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
  block(weapon,-10,0,0,7,3,3.5,boot);
  block(weapon,-1,2.6,0,11,1.2,1.5,steel);
  // Weapon that can finish on the floor independently of a falling torso.
  block(droppedGun,0,0,0,23,3.0,3.2,steel);
  block(droppedGun,-9,0,0,8,4,4,boot);
  block(droppedGun,12,0,0,8,1.5,2.1,steel);
  const magazineInserted=block(weapon,3,-4,0,2.7,6,2.5,boot);
  const magazineHand=block(chest,0,0,0,2.7,6,2.5,boot);
  magazineHand.visible=false;
  const colors=new Map([cloth,boot,vest,skin,steel].map(material=>
    [material,material.color.clone()] as const));
  return {root,hip,chest,head,weapon,droppedGun,feet,arms,pack,colors,
    magazineInserted,magazineHand,
    lastTime:-1,lastPose:null,
    footsteps:createFootstepScheduler(),reachRequest:null,
    gripError:0,stockError:0,eyeError:0,handlingProfile:null,
    lastHandling:null,lastHandlingAt:-100,autoHandling:null,
    elbowSpread:[0,0],legGap:[0,0],
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
  const downProgress=clamp(p.downProgress??(p.down?1:0),0,1);
  const smooth=(t:number)=>{const v=clamp(t,0,1);return v*v*(3-2*v)};
  const buckle=p.down&&!p.surrender?smooth(downProgress/.48):0;
  const kneel=p.surrender?smooth(downProgress/.65):0;
  const physicalSpeed=p.blocked?0:p.velocity;
  const moving=p.down?0:Math.min(1,physicalSpeed/72);
  const direction=p.travelYaw??(r.lastPose?
    Math.atan2(p.z-r.lastPose.z,p.x-r.lastPose.x):p.heading);
  const travel=moving>.14?direction:p.heading;
  // Tactical strafing and reverse movement keep the pelvis oriented toward
  // the threat; translation is not the same thing as facing.
  const lateral=Math.abs(Math.sin(travel-p.heading))>.52;
  const reverse=Math.cos(travel-p.heading)<-.4;
  const hipTarget=moving>.22&&!lateral&&!reverse?travel:p.heading;
  // Do not rotate the pelvis yet: the fixed-step foot contacts are needed
  // before the one authoritative root heading can be selected.
  // Fixed-step recorded acceleration replaces render-rate velocity deltas.
  const braking=clamp(-(p.acceleration??0)/180,-1,1);
  const crouch=p.posture==='crouch'?8:0;
  r.hip.position.y=20.2-crouch;
  r.chest.position.y=26-crouch;
  // Low traversal carries a rearward pelvis and counterbalanced thorax.
  r.hip.position.x=p.posture==='crouch'?-0.85:0;
  r.chest.position.x=p.posture==='crouch'?1.15:0;
  // Build 119: the footstep scheduler owns world contacts. The IK renderer
  // consumes its targets but must never relocate a planted anchor.
  const travelYaw=p.travelYaw??direction;
  const gaitInput:FootstepInput={
    time:p.seconds,position:{x:p.x,y:p.z},rootYaw:-p.heading,
    travelYaw,facingYaw:p.heading,speed:physicalSpeed,turning:p.turning,
    posture:p.posture,injury:p.injury,down:p.down,
    cautious:p.aiming&&moving<.35,blocked:p.blocked,
    gait:p.gait,
    footAllowed:p.footAllowed,
  };
  // The step scheduler is the SOLE writer of foot contacts, including
  // clearance recovery. IK below solves toward these positions; it does
  // not silently substitute its own position or restart a step.
  const targets:[FootTarget,FootTarget]=p.replayFeet?
    validatedReplayFeet(gaitInput,p.replayFeet):
    advanceFootsteps(r.footsteps,gaitInput);
  const kickAge=p.seconds-p.lastDoorAt;
  const kick=p.doorMethod==='kick'&&kickAge>=0&&kickAge<.76?
    kickMotion(kickAge):null;
  const bash=contactReaction(p.seconds-(p.lastBashAt??-100),
    p.bashRole??null,!!p.blocked);
  const handling=p.handlingOverride??handlingPose({
    aim:p.aimBlend??(p.aiming?1:0),moving,
    obstruction:!!p.obstruction||
      (bash.active&&p.bashRole==='receive'),
    friendlyNear:!!p.friendlyNear,
    intent:p.handlingIntent,threatRange:p.threatRange,weapon:p.weapon,
    previous:p.deterministic?undefined:r.lastHandling??undefined,
    heldFor:p.seconds-r.lastHandlingAt
  });
  const passiveBlend=!p.deterministic&&!p.handlingOverride&&
    !p.aiming&&!p.firing&&!p.down&&!p.surrender;
  if(!p.handlingOverride&&handling!==r.lastHandling){
    if(passiveBlend&&r.lastHandling){
      r.autoHandling={from:r.lastHandling,to:handling,alpha:0,
        at:p.seconds,
        fromProfile:r.handlingProfile??handlingProfile(r.lastHandling,p.weapon),
        fromWeapon:{origin:r.weapon.position.clone(),
          rotation:r.weapon.rotation.clone()}};
    }else r.autoHandling=null;
    r.lastHandling=handling;r.lastHandlingAt=p.seconds;
  }
  const auto=r.autoHandling&&passiveBlend?{
    ...r.autoHandling,alpha:smoothHandling(
      (p.seconds-r.autoHandling.at)/.24)}:undefined;
  if(!passiveBlend)r.autoHandling=null;
  if(auto&&auto.alpha>=1)r.autoHandling=null;
  const activeTransition=p.handlingTransition??auto;
  const profile=activeTransition?
    blendedHandlingProfile(activeTransition.from,
      activeTransition.to,activeTransition.alpha,p.weapon,
      activeTransition.fromProfile):
    handlingProfile(handling,p.weapon);
  // Explicit laboratory stances can shift the chest/weight. Live combat
  // retains the authoritative shot-time muzzle/chest transform until the
  // equivalent shot-time balance transform is integrated.
  r.handlingProfile=profile;
  const poseWeight=p.handlingOverride&&!p.down&&!p.surrender?1:0;
  // A pivot requires the stance to catch up with requested facing.
  // In replay/lab this orientation is reconstructed by time, never dt.
  // The pelvis yaw has exactly ONE final writer, after contact scheduling.
  // Live/replay use the recorded pelvis state; the isolated lab uses its
  // scheduler on pivots and a bounded turn toward motor facing otherwise.
  const motorYaw=-hipTarget;
  const scheduledYaw=p.pelvisYaw??(r.footsteps.mode==='pivot'?
    r.footsteps.pelvisYaw:undefined);
  r.root.rotation.y=scheduledYaw??(p.deterministic?motorYaw:
    approach(r.root.rotation.y,motorYaw,3.8,dt));
  const headingYaw=r.root.rotation.y;
  const turn=turnHierarchy({pelvisYaw:headingYaw,
    bodyHeading:p.heading,targetHeading:p.shotHeading??p.heading,
    speed:physicalSpeed,aiming:p.aiming});
  r.chest.rotation.y=p.deterministic?turn.chestYaw:
    approach(r.chest.rotation.y,turn.chestYaw,
      p.aiming?7.5:5.8,dt);
  r.head.rotation.y=p.deterministic?turn.headYaw:
    approach(r.head.rotation.y,turn.headYaw,10.0,dt);
  const motion=bodyFromContacts({velocity:p.down?0:physicalSpeed,
    heading:p.heading,travelYaw,turning:p.turning,
    injury:p.injury,posture:p.posture,feet:targets,gait:p.gait,
    hybridSupport:p.hybridSupport,acceleration:p.acceleration,
    weaponWeight:p.weapon==='shotgun'?1.30:
      p.weapon==='rifle'?1.19:p.weapon==='smg'?.83:1,
    position:{x:p.x,y:p.z}});
  // Wide side-steps need a physical lowering of the center of mass,
  // not a longer limb or a shoe teleported away from its world anchor.
  // Build 184: the balance solver already accounts for reachable hip
  // height. Do not apply another independent stance-radius correction.
  const neutralHip=20.2-crouch;
  const stanceHip=neutralHip+motion.pelvisY-bash.brace;
  r.hip.position.y=Math.max(
    17.35-crouch-buckle*8-kneel*9,
    stanceHip-buckle*8-kneel*9);
  r.hip.position.y-=poseWeight*profile.stanceCompression;
  // The pelvic shell accepts support rotation but is not a second
  // independent writer of the world/root heading or foot anchors.
  r.hip.rotation.x=clamp(-motion.support*physicalSpeed/72*.022,-.03,.03);
  r.hip.position.z=motion.pelvisSide+
    poseWeight*profile.pelvisShift;
  const aimLevel=clamp(p.aimBlend??(p.aiming?1:0),0,1);
  // Physical bob fades out before firing: live muzzle geometry remains the
  // same fixed-step weapon solution used by ballistics.
  const freeMotion=p.down||p.surrender||p.firing?0:
    clamp((.32-aimLevel)/.32,0,1);
  r.chest.position.y=26-crouch+motion.pelvisY*.5+
    motion.chestLift*freeMotion*1.4-
    bash.brace*.4-buckle*7-kneel*12;
  r.chest.position.z=motion.pelvisSide*.75+
    poseWeight*profile.pelvisShift*.45;
  r.chest.rotation.z=motion.torsoForward+braking*.018+
    (kick?.torsoLean??0)+bash.lean-
    poseWeight*profile.torsoLean-
    (p.posture==='crouch'?.075:0);
  r.chest.rotation.x=clamp(p.injury===2?.07:p.injury===1?.025:0,0,.09)+
    motion.torsoSide;
  r.chest.rotation.y+=motion.torsoYaw+
    poseWeight*profile.torsoTurn;
  // A smaller head-only response can run in combat without shifting the
  // weapon/stock muzzle from the authoritative shot-time geometry.
  const sightEngagement=p.handlingOverride?1:
    p.down||p.surrender?0:clamp(p.aimBlend??(p.aiming?1:0),0,1);
  r.head.position.y=10-sightEngagement*profile.headDrop;
  r.head.rotation.x=motion.headCounter+bash.head+
    poseWeight*profile.headPitch;
  // Apply the collapsing root transform before solving the legs.
  // Inverse full-body rotation holds each shoe in world-space contact
  // instead of sweeping planted boots through the floor during a fall.
  const reaction=hitStagger(p.hitRegion??'torso',
    p.hitYaw??p.heading,p.heading,
    p.hitAge===undefined?100:p.hitAge,p.hitSeverity??1);
  const injuryTilt=p.injury===2?.16:p.injury===1?.05:0;
  const collapse=fallAngles(p.downPose??'forward',downProgress);
  const impactPulse=Math.sin(Math.PI*downProgress);
  r.root.rotation.x=p.surrender?-.22:
    p.down?collapse.x+reaction.forward*.12*impactPulse:
      -(injuryTilt+reaction.forward);
  r.root.rotation.z=p.surrender?.09:
    p.down?collapse.z+reaction.side*.10*impactPulse:
      clamp(p.injury===2?.065:p.injury===1?.018:0,0,.08)+
      reaction.side;
  r.root.position.y=p.surrender?-3-3*kneel:p.down?collapse.y:0;
  const bodyInverse=r.root.quaternion.clone().invert();
  for(let i=0;i<2;i++){
    const foot=r.feet[i],sign=i===0?-1:1,target=targets[i];
    const hipLocal=P(0,r.hip.position.y,r.hip.position.z+sign*LEG_HIP_SIDE);
    const anchor=target.position;
    foot.anchor.set(anchor.x,1.45,anchor.y);
    // Replay seeks must never inherit a pole fallback from another time.
    if(p.deterministic)foot.bend.set(1,0,0);
    foot.swinging=!target.contact;
    const targetWorld=P(target.position.x,1.45+target.height,
      target.position.y);
    if(i===1&&kick){
      targetWorld.x+=Math.cos(p.heading)*kick.reach;
      targetWorld.z+=Math.sin(p.heading)*kick.reach;
      targetWorld.y+=kick.lift;
      foot.swinging=true;
    }
    let relative=targetWorld.sub(P(p.x,r.root.position.y,p.z))
      .applyQuaternion(bodyInverse);
    let leg=solveTwoBone(hipLocal,relative,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,
      P(4.5,0,sign*1.1),LEG_LIMITS,foot.bend);
    // An unreachable leg reports a gap. Never move the boot independently
    // of its contact schedule: recoveries are requested by the scheduler.
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
  const recoil=p.recoil??(p.firing?1.5:0);
  const fit=fitWeaponPose({weapon:p.weapon,handling,
    yaw:-(p.shotHeading??p.heading)-r.root.rotation.y-r.chest.rotation.y,
    recoil,clearanceRetraction:p.clearanceRetraction,
    swayYaw:motion.weaponYaw*freeMotion,
    swayPitch:motion.weaponPitch*freeMotion,
    aimBlend:p.handlingOverride?undefined:
      p.aimBlend??(p.aiming?1:0),
    blendFrom:activeTransition?.from,
    blendAlpha:activeTransition?.alpha,
    blendSnapshot:activeTransition?.fromWeapon});
  r.gripError=fit.contactError;
  r.stockError=fit.stockError;
  // Contact coordinates and visible weapon use one rigid transform.
  r.weapon.scale.set(data.lengthScale,1,1);
  r.weapon.rotation.copy(fit.rotation);
  r.weapon.position.copy(fit.origin);
  // On ADS, bring the eyes toward the actual sight line, keeping the
  // firearm fixed. Head-only accommodation cannot change shot ballistics.
  r.head.position.z=0;
  if(handling==='ads'&&!p.down&&!p.surrender){
    const strength=p.handlingOverride?1:
      clamp(p.aimBlend??(p.aiming?1:0),0,1);
    const eye=P(4.5,r.head.position.y+3,3.0);
    const sight=P(-1*data.lengthScale,2.6,0)
      .applyEuler(fit.rotation).add(fit.origin);
    const ray=P(1,0,0).applyEuler(fit.rotation).normalize();
    const nearest=sight.addScaledVector(ray,
      eye.clone().sub(sight).dot(ray));
    // In the Lab the shoulder girdle and chest now help align the sight,
    // so the head should not have to crane dramatically toward the rifle.
    const maxHeadVertical=p.handlingOverride?1.45:2.2;
    const maxHeadLateral=p.handlingOverride?1.2:1.6;
    r.head.position.y+=clamp(nearest.y-eye.y,
      -maxHeadVertical,maxHeadVertical)*strength;
    r.head.position.z+=clamp(nearest.z-eye.z,
      -maxHeadLateral,maxHeadLateral)*strength;
  }
  const eye=P(4.5,r.head.position.y+3,3+r.head.position.z);
  const sight=P(-1*data.lengthScale,2.6,0)
    .applyEuler(fit.rotation).add(fit.origin);
  const axis=P(1,0,0).applyEuler(fit.rotation).normalize();
  const delta=eye.sub(sight);
  r.eyeError=delta.addScaledVector(axis,-delta.dot(axis)).length();
  // Weapon kick and muzzle flash may not break solved hand contacts.
  // A physical door reach may shift the chest a little over the support
  // foot, but the whole character is never allowed to tip like a rigid pole.
  const reloadActive=p.reload>0&&p.reloadDuration>0;
  const reloadProgress=reloadActive?
    clamp(1-p.reload/p.reloadDuration,0,1):0;
  const reloadMode=p.reloadMode??(p.weapon==='shotgun'?'shells':'emergency');
  const magazinePhase=reloadPhase(reloadProgress,reloadMode);
  r.magazineInserted.visible=p.weapon!=='shotgun'&&
    !(p.reloadRemoved&&!p.reloadInserted)&&
    (!reloadActive||reloadProgress<.29||reloadProgress>=.82);
  r.magazineHand.visible=reloadActive&&
    magazinePhase!=='reach'&&magazinePhase!=='settle';
  r.magazineHand.scale.set(
    p.weapon==='shotgun'?.48:1,p.weapon==='shotgun'?.55:1,1);
  const throwAge=p.seconds-p.lastThrowAt;
  const throwActive=throwAge>=0&&throwAge<.70;
  const doorAge=p.seconds-p.lastDoorAt;
  const doorActive=doorAge>=0&&doorAge<.9&&!!p.doorPoint&&
    p.doorMethod!=='kick';
  r.chest.position.x=bash.reach*.18;
  r.reachRequest=null;
  r.weapon.visible=(!p.down&&!p.surrender)||downProgress<.30;
  r.droppedGun.visible=(p.down||p.surrender)&&downProgress>=.30;
  const leftGrip=P(data.supportX,data.supportY,-1.6);
  const rightGrip=P(data.primaryX,data.primaryY,1.8);
  let reaching=false,releaseLeft=false,releaseRight=false;
  if(p.surrender){
    // Deliberate visible surrender: discard the gun, kneel and raise both
    // hands overhead. Unlike an incapacitated actor this is not a fall.
    releaseLeft=true;releaseRight=true;
    const raised=smooth(downProgress/.60);
    leftGrip.set(-1,3+15*raised,-7);
    rightGrip.set(-1,3+15*raised,7);
  }else if(p.down){
    // Support hand gives way first, then the firing hand releases.
    releaseLeft=downProgress>.16;releaseRight=downProgress>.53;
    leftGrip.set(-3,-7,-8);rightGrip.set(-2,-8,8);
  }else if(reloadActive){
    releaseLeft=true;
    const hand=reloadHandKey(reloadProgress,reloadMode,
      data.supportX,data.supportY,data.primaryX);
    leftGrip.set(hand.x,hand.y,hand.z);
  }else if(throwActive){
    releaseLeft=true;
    const t=Math.sin(Math.PI*clamp(throwAge/.7,0,1));
    leftGrip.set(data.supportX+8*t,4+7*t,-7);
  }else if(p.surrender){
    releaseLeft=true;
    const raised=smooth(downProgress/.60);
    leftGrip.set(-1,3+15*raised,-6);
    rightGrip.set(-1,3+15*raised,6);
  }else if(bash.active&&p.bashRole==='push'){
    // A short forearm/shoulder extension separates the opponent, while
    // the primary hand keeps the gun from flailing through the torso.
    releaseLeft=true;
    leftGrip.set(data.supportX+bash.reach*2,-4,-6);
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
    const shoulderPosition=i===0?ANATOMY.shoulderLeft:ANATOMY.shoulderRight;
    const shoulderAdvance=i===0?profile.supportShoulderForward:
      profile.firingShoulderForward;
    const shoulder=P(shoulderPosition.x+poseWeight*shoulderAdvance,
      shoulderPosition.y+poseWeight*profile.shoulderLift,
      shoulderPosition.z-sign*poseWeight*profile.shoulderInward);
    const grip=i===0?leftGrip:rightGrip;
    let desired:THREE.Vector3;
    if(p.down&&(i===0&&releaseLeft||i===1&&releaseRight)){
      desired=grip.clone();
    }else if(p.surrender||i===0&&reaching){
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
    if(p.deterministic)arm.bend.set(3,-9,sign*.5);
    // The IK 'pole' is a bend DIRECTION, not a position. Using absolute
    // z=9 as a direction was abducting both elbows into chicken wings.
    // Convert the desired elbow destination to a shoulder-relative vector.
    // The same pose parameters that drive weapon-ready silhouettes now
    // drive each arm independently, including during interrupted blends.
    const corridor=elbowCorridor(handling,sign as -1|1,profile);
    const wanted=P(corridor.x,corridor.y,corridor.z).sub(shoulder);
    let solved=solveTwoBone(shoulder,wrist,10,10,
      wanted,ARM_LIMITS,arm.bend);
    if(intersectsTorso(solved.joint,.3)){
      // Try a low forward/down elbow before the wide elbow escape route.
      const compact=P(corridor.x+1.0,corridor.y-1.2,
        corridor.z+sign*.22).sub(shoulder);
      const retry=solveTwoBone(shoulder,wrist,10,10,
        compact,ARM_LIMITS,arm.bend);
      if(!intersectsTorso(retry.joint,.25))solved=retry;
      else solved=solveTwoBone(shoulder,wrist,10,10,
        P(corridor.x+1.5,corridor.y-.5,
          corridor.z+sign*.7).sub(shoulder),ARM_LIMITS,arm.bend);
    }
    r.elbowSpread[i]=Math.max(0,
      sign*(solved.joint.z-shoulder.z));
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
  if(r.magazineHand.visible){
    // Magazine visual follows the *solved* support wrist. The original
    // magazine is hidden from the gun while it is in hand.
    r.magazineHand.position.copy(r.arms[0].hand.position);
    r.magazineHand.rotation.copy(r.arms[0].hand.rotation);
  }
  // The pose system is the final writer for actor tilts and reactions.
  // The scene controls XY world placement only, not anatomy or weapon pose.
  if(p.flashActive&&!p.down)r.root.rotation.z+=.10*Math.sin(p.seconds*24);
  if(p.surrender)r.chest.rotation.x=.15;
  else if(p.down){
    // Spine and neck settle independently; the fall isn't a single
    // rigid mannequin tipping around the operator origin.
    r.chest.rotation.x=-.18*Math.sin(Math.PI*downProgress)-.05;
    r.head.rotation.z=.13*Math.sin(Math.PI*downProgress);
  }
  // Wounds do not leave an incapacitated actor standing in the old
  // locomotion/ready pose. Final angles are deterministic from the hit.
  if(p.down){
    r.chest.rotation.y=0;
    r.head.rotation.x=0;
  }
  if(r.droppedGun.visible){
    // The world-space gun begins exactly in the last held grip and travels
    // continuously to the ground, horizontal beside the operator.
    r.root.updateMatrixWorld(true);
    const held=r.weapon.getWorldPosition(new THREE.Vector3());
    const orientation=r.weapon.getWorldQuaternion(new THREE.Quaternion());
    const origin=r.root.getWorldPosition(new THREE.Vector3());
    const side=p.downPose==='left'?-1:1;
    const rest=P(origin.x+9,1.8,origin.z+side*11);
    const t=smooth((downProgress-.30)/.70);
    const location=held.lerp(rest,t);
    r.droppedGun.position.copy(r.root.worldToLocal(location));
    const flat=new THREE.Quaternion().setFromAxisAngle(P(0,1,0),
      -p.heading+side*.18);
    orientation.slerp(flat,t);
    const inverse=r.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    r.droppedGun.quaternion.copy(inverse.multiply(orientation));
  }
  r.lastPose={...p};r.lastTime=p.seconds;
}
