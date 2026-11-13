import {sampleOperatorFootContacts,applyOperatorLegIK} from './breach-operator-lower-body.ts';
import {throwSupportGesture} from './breach-animation-choreography.ts';
import {beginOperatorAnimationFrame,sampleOperatorTurnAngles} from './breach-operator-animation-frame.ts';
import {beginOperatorFramePose,workingOperatorRig,finishOperatorFramePose}
 from './breach-operator-frame-output.ts';
import {updateOperatorAppearance} from './breach-operator-appearance.ts';
/** Roadmap 2 Stage 11: presentation-only operator pose orchestrator.
 * This is the compatibility-preserving home for the existing pose evaluation;
 * it never writes actor simulation, collision, inventory or shot ballistics.
 */
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import * as THREE from 'three';
import {solveOperatorDirectSlingPose} from './breach-operator-sling-pose.ts';
import {beginOperatorEquipmentPose,solveOperatorDroppedWeapon,
 finishOperatorEquipmentPose} from './breach-operator-equipment-output.ts';
import {EQUIPMENT_ATTACHMENT_INDEX as EAI}
 from './breach-operator-pose-scratch.ts';
import {applyOperatorTraumaPose,finishOperatorPoseFrame} from './breach-pose-frame-finalizer.ts';
import {beginOperatorPoseOutput,
 stageDirectOperatorPoseOutput,commitOperatorPoseOutput}
 from './breach-operator-pose-output.ts';
import {canonicalRootOrientation} from './operator-axis-convention.ts';
import {neutralMannequinWrist,neutralMannequinElbowPole}
 from './operator-mannequin-pose.ts';
import {solveTwoBone,ARM_LIMITS} from './breach-ik.ts';
import {beginOperatorArmPose,setOperatorArmSegments,setOperatorHandPose,
 rotateOperatorSupportHand,operatorHandTransform,operatorHandEuler,
 finishOperatorArmPose} from './breach-operator-upper-body-output.ts';
import {idleLifeAt} from './breach-idle-life.ts';
import {lowReadyFamilyFit,lowReadyElbowPole}
 from './breach-low-ready-family-fit.ts';
import type {CoupledLowReadySolution} from './breach-coupled-low-ready.ts';
import {poseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
import {interpolateWeaponCarry,lowReadyBlendPhase}
 from './breach-low-ready-transition.ts';
import {bodyFromContacts} from './breach-body-motion.ts';
import {packInertia} from './breach-gear-inertia.ts';
import {LEG_HIP_HEIGHT,legRestRise} from './breach-leg-geometry.ts';
import {turnHierarchy} from './breach-turn-hierarchy.ts';
import {contactReaction} from './breach-contact-reactions.ts';
import {kickMotion} from './breach-door-actions.ts';
import {reloadPhase} from './breach-magazines.ts';
import {reloadHandKey,reloadHandChestTarget} from './breach-reload-motion.ts';
import {choreographV3ReloadHand,v3MagazineRockAngle,v3MagazineBodyGrip,type V3ReloadCorridorProfile,type V3MagazinePalm} from './breach-pose-v3-reload-choreography.ts';
import {choreographV3ReloadWeapon} from './breach-pose-v3-reload-weapon.ts';
import {choreographV4ReloadWeapon,reloadMechanismFor,v4ReloadControlPose}
 from './breach-reload-performance.ts';
import {choreographV4ReloadHand} from './breach-reload-v4-hand.ts';
import {prepareOperatorPoseDecision,resolveOperatorPoseDecision}
 from './breach-pose-decision.ts';
import {chooseTorsoAssist} from './breach-pose-v3-body-assist.ts';
import {cachedCoupledUpperBody,cachedCoordinatedUpperBody,cachedSupportUpperBody,solveUnifiedFallbackArm,continuousElbowPole} from './breach-unified-upper-body.ts';
import type {solveV3CoordinatedPose} from './breach-pose-v3-coordinated.ts';
import {ANATOMY,elbowCorridor,equipmentStockPush} from './breach-anatomy.ts';
import {handlingProfile} from './breach-handling-profiles.ts';
import {authoredShortPhase}
 from './breach-authored-m4a1-short-stock.ts';
import {sampleHandlingTransition,sampleCarryTransition}
 from './breach-pose-transition-director.ts';
import {fallAngles,hitStagger}
  from './breach-wounds.ts';
import {selectedReloadPouchSlot,v4MagazineInHand,v4SelectedPouchVisible,v4AuthoredPouchAnchor}
 from './breach-reload-v4-magazine-handoff.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {weaponPresentationSockets} from './breach-weapon-presentation.ts';
import {resolveWeaponAssembly,sameWeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {weaponGrips,clampReach,shortStockSourceHandling,fitWeaponPose,liveShortStockPose,liveReadyCarryPose,type WeaponFit}
  from './breach-weapon-pose.ts';

const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const diff=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function approach(v:number,target:number,rate:number,dt:number){
  return v+clamp(diff(v,target),-rate*dt,rate*dt);
}
const P=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const EQUIPMENT_LOCAL_Z=new THREE.Vector3(0,0,1);
export function poseOperator(r:OperatorRig,p:OperatorPose,dt:number){
  // Timing only for opt-in ?perf=1 tactical rigs. Lab, replay and normal
  // gameplay never pay for these marks or store diagnostic objects.
  const profilePose=r.root.userData.fieldworkProfilePose===true;
  const poseStart=profilePose?performance.now():0;
  let appearanceMs=0,weaponBuildMs=0;
  const diagnosticsEnabled=p.poseDiagnostics!==false;
  const {scratch,discontinuity,dt:frameDt}=beginOperatorAnimationFrame(r,p,dt);
  beginOperatorPoseOutput(r,p);
  const frame=beginOperatorFramePose(r,scratch);
  const workingRig=workingOperatorRig(frame);
  const equipment=beginOperatorEquipmentPose(r,scratch);
  const [heldWeapon,droppedWeapon]=equipment.weapons;
  const attachments=equipment.attachments;
  dt=frameDt;
  const appearanceStart=profilePose?performance.now():0;
  const clothing=updateOperatorAppearance(r,p);
  if(profilePose)appearanceMs=performance.now()-appearanceStart;
  const downProgress=clamp(p.downProgress??(p.down?1:0),0,1);
  const smooth=(t:number)=>{const v=clamp(t,0,1);return v*v*(3-2*v)};
  const buckle=p.down&&!p.surrender?smooth(downProgress/.48):0;
  const kneel=p.surrender?smooth(downProgress/.65):0;
  // B1: prepare one observational action/handling decision alongside the
  // existing pure locomotion sample; bash facts never mutate the motor.
  const bash=contactReaction(p.seconds-(p.lastBashAt??-100),
    p.bashRole??null,!!p.blocked);
  const preparedDecision=prepareOperatorPoseDecision(p,{
    previousPose:r.lastPose,downProgress,
    pushActive:bash.active&&p.bashRole==='push',
    receivingBash:bash.active&&p.bashRole==='receive',
    previousHandling:r.lastHandling??undefined,
    previousHandlingAt:r.lastHandlingAt
  });
  const {physicalSpeed,moving,direction,hipTarget,crouch}=
    preparedDecision.locomotion;
  frame.hip.position.y=LEG_HIP_HEIGHT-crouch;
  frame.chest.position.y=26-crouch;
  // Low traversal carries a rearward pelvis and counterbalanced thorax.
  frame.hip.position.x=p.posture==='crouch'?-0.85:0;
  frame.chest.position.x=p.posture==='crouch'?1.15:0;
  // Build 119: the footstep scheduler owns world contacts. The IK renderer
  // consumes its targets but must never relocate a planted anchor.
  const travelYaw=p.travelYaw??direction;
  const targets=sampleOperatorFootContacts(r,p,physicalSpeed,moving,travelYaw);
  const kickAge=p.seconds-p.lastDoorAt;
  const kick=p.doorMethod==='kick'&&kickAge>=0&&kickAge<.76?
    kickMotion(kickAge):null;
  const {handling}=preparedDecision;
  // The existing transition sampler remains the ONLY rig-owned historical
  // writer. B1 assembles its result into one read-only policy decision.
  const sample=sampleHandlingTransition(r,p,handling);
  const decision=resolveOperatorPoseDecision(p,preparedDecision,sample);
  const {action:actionState}=decision;
  const {treatmentActive,reloadActive,reloadProgress,reloadMode,
    throwAge,throwActive,doorAge,doorActive,gripWeight,handOwners}=actionState;
  const {manual:manualShort,rawProgress:manualRaw}=decision.shortStock;
  const {active:activeTransition,authoredLabSwitch}=decision.transition;
  const {profile,upperBody:upperBodyPlan,poseWeight}=decision;
  // Explicit laboratory stances can shift the chest/weight. Live combat
  // retains the authoritative shot-time muzzle/chest transform until the
  // equivalent shot-time balance transform is integrated.
  r.handlingProfile=profile;
  const familyLow=lowReadyFamilyFit(p.weaponConfiguration);
  // Smoothly retire the relaxed hold when accelerating, aiming, reloading
  // or engaging. All combat-facing muzzle fits retain their original data.
  // Retire old independent stock/grip/yaw/elbow offsets. Stationary AR/AK
  // low-ready is handled by ONE coupled physical solution below, while
  // ADS, reload, moving and all non-family weapons retain their old path.
  const relaxedLowReady=0;
  // A pivot requires the stance to catch up with requested facing.
  // In replay/lab this orientation is reconstructed by time, never dt.
  // The pelvis yaw has exactly ONE final writer, after contact scheduling.
  // Live/replay use the recorded pelvis state; the isolated lab uses its
  // scheduler on pivots and a bounded turn toward motor facing otherwise.
  const motorYaw=-hipTarget;
  const scheduledYaw=p.pelvisYaw??(r.footsteps.mode==='pivot'?
    r.footsteps.pelvisYaw:undefined);
  r.legacyYaw=scheduledYaw??(p.deterministic||discontinuity||!r.lastPose?
    motorYaw:approach(r.legacyYaw,motorYaw,3.8,dt));
  const headingYaw=r.legacyYaw;
  const turn=turnHierarchy({pelvisYaw:headingYaw,
    bodyHeading:p.heading,targetHeading:p.shotHeading??p.heading,
    speed:physicalSpeed,aiming:p.aiming});
  // Never smooth from frame.chest.rotation.y. Later body sway, stance and
  // coordinated IK add offsets to that Euler, which must not persist as
  // the next frame's starting point.
  const turns=sampleOperatorTurnAngles(r,p,turn,dt,discontinuity);
  frame.chest.rotation.y=turns.chest;
  const idleLife=idleLifeAt(p.idleLifeSeconds??p.seconds,
    p.appearanceSeed??0,{speed:physicalSpeed,aiming:p.aiming||
      (p.aimBlend??0)>.16,firing:p.firing,reloading:p.reload>0,
      down:p.down,surrender:p.surrender,interacting:!!p.treatmentActive||
      p.traversalProgress!==undefined&&p.traversalProgress>0,
      precontact:p.precontact});
  // Presentation glances are layered on the clean head target, not fed
  // into next frame's approach() state.
  frame.head.rotation.y=turns.head+idleLife.glance;
  const motion=bodyFromContacts({velocity:p.down?0:physicalSpeed,
    heading:p.heading,travelYaw,turning:p.turning,
    injury:p.injury,posture:p.posture,feet:targets,gait:p.gait,
    down:p.down,surrender:p.surrender,
    hybridSupport:p.hybridSupport,acceleration:p.acceleration,
    motionImpulse:p.motionImpulse,blocked:p.blocked,
    seconds:p.seconds,personalPhase:r.personality.phase,
    personalLooseness:r.personality.looseness,
    tacticalTension:p.aiming||p.handlingIntent==='engage'||
      p.handlingIntent==='pie'||p.handlingIntent==='look'?1:
      p.handlingIntent==='door'||p.posture==='crouch'?.55:0,
    weaponWeight:p.weapon==='shotgun'?1.30:
      p.weapon==='rifle'?1.19:p.weapon==='smg'?.83:1,
    position:{x:p.x,y:p.z}});
  // Pack follows the torso with restrained inertia, not separate timing.
  const packMotion=packInertia(p.acceleration??0,motion.torsoSide);
  attachments[EAI.pack].position.set(-8.2,0,
    packMotion.side*r.personality.packScale);
  equipment.packEuler.z=packMotion.lean*r.personality.packScale;
  attachments[EAI.pack].quaternion.setFromEuler(equipment.packEuler);
  // Wide side-steps need a physical lowering of the center of mass,
  // not a longer limb or a shoe teleported away from its world anchor.
  // Build 184: the balance solver already accounts for reachable hip
  // height. Do not apply another independent stance-radius correction.
  const neutralHip=LEG_HIP_HEIGHT-crouch;
  // Stage 1: one standing hip/leg calibration for all weapon holds AND the
  // unarmed mannequin. The lift applies to pelvis and chest together;
  // it never moves planted feet or stretches the two-bone skeleton.
  // Shot-time muzzle elevation consumes this same pure rise.
  const mannequinLift=legRestRise(physicalSpeed,p.posture,
    p.down,p.surrender);
  const stanceHip=neutralHip+motion.pelvisY-bash.brace;
  frame.hip.position.y=Math.max(
    17.35-crouch-buckle*8-kneel*9,
    stanceHip-buckle*8-kneel*9);
  frame.hip.position.y-=poseWeight*profile.stanceCompression;
  // The pelvis lifts WITH the upper body; it never drives its visual
  // shell up into a stationary chest.
  frame.hip.position.y+=mannequinLift;
  // The pelvic shell accepts support rotation but is not a second
  // independent writer of the world/root heading or foot anchors.
  frame.hip.rotation.x=clamp(-motion.support*physicalSpeed/72*.022,-.03,.03);
  frame.hip.position.z=motion.pelvisSide+
    poseWeight*profile.pelvisShift;
  // Preserve the actual last displayed pelvis on rapid Lab retargets;
  // knees are re-solved from planted ankles, never independently lerped.
  if(authoredLabSwitch&&activeTransition?.authoredHip){
    const t=lowReadyBlendPhase(activeTransition.alpha);
    frame.hip.position.lerpVectors(
      activeTransition.authoredHip.position,frame.hip.position,t);
    const fromQ=scratch.poseBlendFrom.setFromEuler(
      activeTransition.authoredHip.rotation);
    const toQ=scratch.poseBlendTo.setFromEuler(frame.hip.rotation);
    frame.hip.rotation.setFromQuaternion(fromQ.slerp(toQ,t),'XYZ');
  }
  const aimLevel=clamp(p.aimBlend??(p.aiming?1:0),0,1);
  // Physical bob fades out before firing: live muzzle geometry remains the
  // same fixed-step weapon solution used by ballistics.
  const freeMotion=p.down||p.surrender||p.firing?0:
    clamp((.32-aimLevel)/.32,0,1);
  frame.chest.position.y=26-crouch+idleLife.breathe+motion.pelvisY*.5+
    motion.chestLift*freeMotion*1.4-
    bash.brace*.4-buckle*7-kneel*12+mannequinLift-
    poseWeight*profile.stanceCompression;
  frame.chest.position.z=motion.pelvisSide*.75+
    poseWeight*profile.pelvisShift*.45;
  frame.chest.rotation.z=motion.torsoForward+idleLife.sway+
    (kick?.torsoLean??0)+bash.lean-
    poseWeight*profile.torsoLean-
    (p.posture==='crouch'?.075:0);
  frame.chest.rotation.x=clamp(p.injury===2?.07:p.injury===1?.025:0,0,.09)+
    motion.torsoSide;
  frame.chest.rotation.y+=motion.torsoYaw+
    poseWeight*profile.torsoTurn+
    relaxedLowReady*(familyLow?.torsoTurn??0);
  if(p.unarmedPreview&&physicalSpeed<.5&&p.posture==='stand'&&
    !p.down&&!p.surrender){
    // Stable unarmed modeling reference. These transforms belong to
    // wardrobe presentation only; no replay/weapon/locomotion changes.
    frame.chest.rotation.x=0;
    frame.chest.rotation.z=0;
    frame.hip.rotation.x=0;
  }
  // A smaller head-only response can run in combat without shifting the
  // weapon/stock muzzle from the authoritative shot-time geometry.
  const sightEngagement=p.unarmedPreview?0:p.handlingOverride?1:
    p.down||p.surrender?0:clamp(p.aimBlend??(p.aiming?1:0),0,1);
  frame.head.position.y=10-sightEngagement*profile.headDrop;
  frame.head.rotation.x=p.unarmedPreview&&physicalSpeed<.5&&
    p.posture==='stand'&&!p.down?0:
    motion.headCounter+bash.head+poseWeight*profile.headPitch+
    idleLife.headDip;
  frame.head.rotation.z=motion.headPitchCounter;
  // Apply the collapsing root transform before solving the legs.
  // Inverse full-body rotation holds each shoe in world-space contact
  // instead of sweeping planted boots through the floor during a fall.
  const reaction=hitStagger(p.hitRegion??'torso',
    p.hitYaw??p.heading,p.heading,
    p.hitAge===undefined?100:p.hitAge,p.hitSeverity??1);
  const injuryTilt=p.injury===2?.16:p.injury===1?.05:0;
  const collapse=fallAngles(p.downPose??'forward',downProgress,p.downClearance??1);
  const impactPulse=Math.sin(Math.PI*downProgress);
  const vaultPhase=Math.max(0,Math.min(1,p.traversalProgress??0));
  const vaultTuck=vaultPhase>0&&vaultPhase<1?
    Math.sin(Math.PI*vaultPhase):0;
  r.legacyPitch=p.surrender?-.22:
    p.down?collapse.x+reaction.forward*.12*impactPulse:
      -(injuryTilt+reaction.forward)-vaultTuck*.26;
  r.legacyRoll=p.surrender?.09:
    p.down?collapse.z+reaction.side*.10*impactPulse:
      clamp(p.injury===2?.065:p.injury===1?.018:0,0,.08)+
      reaction.side;
  // The scene translates the whole miniature to the motor's elevation.
  // Here only tuck the local torso. Avoid a second independent vertical arc.
  frame.root.position.y=p.surrender?-3-3*kneel:p.down?collapse.y:
    -vaultTuck*2.8;
  // World-space anatomy is IDENTICAL to the old model:
  // canonicalRoot * legacyFrame(+90 Y) = original Euler(pitch,yaw,roll).
  frame.root.quaternion.copy(
    canonicalRootOrientation(r.legacyPitch,r.legacyYaw,r.legacyRoll));
  const legPose=applyOperatorLegIK(workingRig,p,scratch,targets,kick,headingYaw,smooth);
  // B3: all eight lower-body transforms are now computed off-scene.
  // Only the final B2 publication may write those visible leg nodes.
  stageDirectOperatorPoseOutput(r,p,'lower-body',legPose);
  // Build 120: stock, both grips and forearm targets share a single rigid
  // firearm transform. The fit searches reachable posture before limb IK.
  const config=p.weaponConfiguration?.weapon===p.weapon?
    p.weaponConfiguration:undefined;
  if(r.visualWeapon!==p.weapon||
     !sameWeaponConfiguration(r.visualWeaponConfiguration,config)){
    const buildStart=profilePose?performance.now():0;
    // A weapon/platform or immutable attachment configuration changed.
    // Clear stale dropped geometry too, but do not rebuild an invisible
    // *second weapon* for every healthy actor on their first pose.
    // Dropped meshes are populated synchronously when the real pose first
    // shows them, so downing/surrender never produces an empty frame.
    for(const group of [r.weaponBody,r.droppedWeaponBody,
      r.weaponAccessories,r.droppedAccessories,r.detachedMagazine])
      clearWeaponSilhouette(group);
    const model=buildWeaponSilhouette(p.weapon,r.weaponSteel,r.weaponDark,config);
    // Preserve the read-only stock descriptor for the live fitted weapon.
    r.weaponBody.userData.visibleStockContact=
      model.userData.visibleStockContact??null;
    while(model.children.length)r.weaponBody.add(model.children[0]);
    r.droppedWeaponBody.userData.visibleStockContact=null;
    // Detachable geometry is copied from precisely the same named AR/AK
    // magazine slot. No extra placeholder or alternate silhouette exists.
    const magazineSocket=weaponPresentationSockets(p.weapon,config).magazine;
    for(const mesh of r.weaponBody.children){
      if(!(mesh instanceof THREE.Mesh)||!mesh.name.startsWith('family-magazine-'))
        continue;
      const copy=mesh.clone();copy.geometry=mesh.geometry.clone();
      copy.position.x-=magazineSocket.x;copy.position.y-=magazineSocket.y;
      r.detachedMagazine.add(copy);
    }
    if(config){
      const accessories=buildWeaponAccessories(config,r.weaponSteel,r.weaponDark,
       r.weaponLensMaterial);
      while(accessories.children.length)
       r.weaponAccessories.add(accessories.children[0]);
    }
    r.weaponLightLens=r.weaponAccessories.getObjectByName('weapon-light-lens')??null;
    r.droppedLightLens=null;
    r.visualWeapon=p.weapon;r.visualWeaponConfiguration=config;
    if(profilePose)weaponBuildMs+=performance.now()-buildStart;
  }
  if(r.weaponLightLens)r.weaponLightLens.visible=!!p.weaponLightOn&&
    !p.down&&!p.surrender;
  if(r.droppedLightLens)r.droppedLightLens.visible=false;
  const data=weaponGrips(p.weapon,p.weaponConfiguration,
    handling,relaxedLowReady);
  const recoil=p.recoil??(p.firing?1.5:0);
  const relativeYaw=-(p.shotHeading??p.heading)-r.legacyYaw-
    frame.chest.rotation.y;
  const shoulderFor=(i:number)=>{
    const sign=i===0?-1:1;
    const base=i===0?ANATOMY.shoulderLeft:ANATOMY.shoulderRight;
    // A modular rifle's approved low-ready shoulders are the *actual*
    // anatomical joints. The explicit Lab pose formerly shifted both
    // shoulders .42 units downward, invalidating the physical pose that
    // gameplay already used. Other handling modes retain their profiles.
    const shoulderWeight=handling==='low'&&
      !!p.weaponConfiguration?.build?0:poseWeight;
    const target=P(base.x+shoulderWeight*(i===0?
      profile.supportShoulderForward:profile.firingShoulderForward),
      base.y+shoulderWeight*profile.shoulderLift,
      base.z-sign*shoulderWeight*profile.shoulderInward);
    // Existing modular low ready uses fixed anatomical anchors. Blend
    // *from the rendered old shoulder* when the Lab enters that mode,
    // otherwise the first frame can still pop despite a smooth gun.
    const source=authoredLabSwitch?activeTransition?.authoredArms?.[i]:null;
    return source?source.shoulder.clone().lerp(
      target,lowReadyBlendPhase(activeTransition!.alpha)):target;
  };
  // The coupled solution is deliberately restricted to relaxed, stationary,
  // two-handed AR/AK presentation. Combat aim and shot-time geometry remain
  // on the existing authoritative pose path.
  const coupledConfig=p.weaponConfiguration?.weapon===p.weapon?
    p.weaponConfiguration:undefined;
  // A reload starts from an already validated stationary two-handed
  // low-ready rifle hold. On the V3 Lab preview ONLY, seed the reload
  // weapon with that fit instead of abruptly switching to legacy IK.
  // Do not use the coupled idle *arm* solution during the active reload:
  // the magazine hand is released and needs independent action IK.
  const {previewReloadSeed,coupledEligible:eligible}=upperBodyPlan;
  const poseEnvelope=upperBodyPlan.envelopeRequired?
    poseClearanceEnvelope(clothing.armorStyle,clothing.rigStyle,clothing.top):null;
  let coupled:CoupledLowReadySolution|null=null;
  let reloadSeed:CoupledLowReadySolution|null=null;
  if(eligible&&coupledConfig){
    const look=clothing;
    const shoulders:[THREE.Vector3,THREE.Vector3]=[
      shoulderFor(0),shoulderFor(1)];
    const solveAtTorsoYaw=(assistYaw:number)=>{
      // Offset chest yaw and subtract it from chest-local weapon yaw:
      // the physical shoulder axes and weapon/hand contacts stay coherent.
      const localYaw=relativeYaw-assistYaw;
      return cachedCoupledUpperBody(r,{
        weapon:p.weapon,configuration:coupledConfig,
        envelope:poseEnvelope!,shoulders,localYaw,poseWeight,
        allowVisualOverlap:!!p.poseV3Preview&&!p.poseV3StrictContact
      },assistYaw===0).result;
    };
    // Only the explicit Lab query may audition body/weapon coupling.
    // Normal gameplay, replay and authoritative aim retain original yaw.
    const previewAssist=p.poseV3Preview===true&&
      p.handlingOverride==='low';
    const selected=chooseTorsoAssist(solveAtTorsoYaw,previewAssist,
      look.armorStyle==='plate-heavy'?shoulders[1]:undefined);
    coupled=selected?.solution??null;
    const torsoAssistYaw=selected?.yaw??0;
    if(previewAssist)frame.chest.rotation.y+=torsoAssistYaw;
    r.root.userData.lowReadyPoseReport=diagnosticsEnabled?{
      status:coupled?.status??'unresolved',
      mode:coupled?.mode??'unresolved',weapon:p.weapon,
      fittingYaw:relativeYaw-torsoAssistYaw,torsoAssistYaw,
      fittingShoulders:shoulders.map(v=>v.toArray()),
      armor:look.armorStyle,rig:look.rigStyle,top:look.top,
      penetration:coupled?.penetration??null,
      softContact:coupled?.softContact??null,
      poseQuality:coupled?.quality??null,
      elbowLeft:coupled?.arms[0].joint.toArray()??null,
      elbowRight:coupled?.arms[1].joint.toArray()??null,
      supportFraction:coupled?.supportFraction??null,
      candidates:coupled?.candidates??0}:null;
    if(previewReloadSeed){
      // Preserve actual firearm contacts, but never keep the static
      // support elbow during the released-hand reload animation.
      reloadSeed=coupled;coupled=null;
    }
  }else r.root.userData.lowReadyPoseReport=null;
  // Explicit stationary high/low Workbench poses are authoring references:
  // no independent tactical torso-turn or breathing sway may rotate the
  // displayed rifle away from the exported XYZ weapon transform.
  const authoringCarry=(p.handlingOverride==='high'||
    p.handlingOverride==='low')&&physicalSpeed<.2;
  let fit=reloadSeed?.fit??coupled?.fit??fitWeaponPose({weapon:p.weapon,handling,
    configuration:p.weaponConfiguration,
    // Explicit Lab short-stock is the exact XYZ pose exported from the
    // Workbench, without the automatic director's small facing offset.
    // Live actor-relative yaw remains the shared shot/render authority.
    yaw:manualShort&&p.handlingOverride==='short'||authoringCarry?
      0:relativeYaw,
    recoil,clearanceRetraction:p.clearanceRetraction,
    shortCompression:manualRaw??p.shortCompression,
    shortFrom:p.clearanceShortFrom??shortStockSourceHandling(
      p.aimBlend??(p.aiming?1:0),moving,p.weapon,!!p.friendlyNear),
    relaxedLowReady,
    swayYaw:authoringCarry?0:motion.weaponYaw*freeMotion,
    swayPitch:authoringCarry?0:motion.weaponPitch*freeMotion,
    armorPush:equipmentStockPush(p.equipment),
    // Non-firing movement and manipulation cannot retain stale visual ADS.
    // This affects only carry presentation, never shot-time muzzle authority.
    aimBlend:p.handlingOverride?undefined:
      p.handlingIntent==='run'||p.handlingIntent==='traverse'||
      p.handlingIntent==='reload'||p.handlingIntent==='treat'?0:
      p.aimBlend??(p.aiming?1:0),
    blendFrom:p.clearanceCarry==='low'&&
       p.clearanceBlend!==undefined?'ready':
      authoredLabSwitch||p.shortCompression!==undefined?
      undefined:activeTransition?.from,
    blendAlpha:p.clearanceCarry==='low'?
      p.clearanceBlend:
      authoredLabSwitch||p.shortCompression!==undefined?
      undefined:activeTransition?
      lowReadyBlendPhase(activeTransition.alpha):undefined,
    blendSnapshot:p.clearanceCarry!==undefined||
      authoredLabSwitch||p.shortCompression!==undefined?
      undefined:activeTransition?.fromWeapon});
  // Small, deterministic rifle manipulation is permissible in the Lab
  // only while reloading: never alters shot-time muzzle or live aiming.
  // It pivots about the seated stock so the firing wrist can clear gear.
  r.root.userData.reloadV4Cue=null;
  if(p.poseV3Preview&&p.reload>0&&p.reloadDuration>0&&
     !p.firing&&!p.down&&!p.surrender&&coupledConfig?.build){
    const t=clamp(1-p.reload/p.reloadDuration,0,1);
    const mode=p.reloadMode??(p.weapon==='shotgun'?'shells':'emergency');
    if(p.poseV4ReloadPreview){
      const presentation=choreographV4ReloadWeapon(fit,mode,t,
        reloadMechanismFor(p.weapon,coupledConfig));
      fit=presentation.fit;
      r.root.userData.reloadV4Cue=presentation.cue;
    }else fit=choreographV3ReloadWeapon(fit,t,mode,
      p.poseV3ReloadHold??'baseline').fit;
  }
  // Lab-only: a family rifle may be gripped farther back on its *actual*
  // handguard/magwell. This is a contact change, never a muzzle transform.
  // Do not apply to shot-time ballistics or alter an approved coupled pose.
  if(!coupled&&upperBodyPlan.supportEligible&&coupledConfig?.build){
    const supportSearch=cachedSupportUpperBody(r,{
      weapon:p.weapon,configuration:coupledConfig,fit,
      shoulder:shoulderFor(0),firingShoulder:shoulderFor(1),
      envelope:poseEnvelope!,
      mode:p.reload>0?'reload':p.aiming||handling==='ads'?
        'aim':'carry'
    });
    const choice=supportSearch.result;
    fit=choice.fit;
    r.root.userData.poseV3SupportGrip=diagnosticsEnabled?{
      selected:choice.selected,fraction:choice.fraction,
      quality:choice.quality,candidates:choice.candidates,
      cached:supportSearch.cached,reason:choice.reason
    }:null;
  }else r.root.userData.poseV3SupportGrip=null;
  // V3 Stage 6b: rotate the *chest* a few degrees and counter-rotate the
  // rigid weapon into its new local frame. World muzzle, stock, firing grip
  // and the existing reload interaction path stay in the same positions.
  // This is a whole-pair solution, not two competing elbow corrections.
  let coordinatedDynamic:ReturnType<typeof solveV3CoordinatedPose>|null=null;
  let v3ReloadClearanceFront:number|undefined;
  let v3LeanParentX=0,v3LeanParentY=0,v3LeanParentZ=0;
  // Look up the selected item in the existing inventory display, NOT a
  // second fake ammo stack. The Lab can use its authored sample magazines.
  const v4Carry=(p.magazineCarryItems??
    p.magazineCarryLocations?.map((location,i)=>({
      id:'v4-preview-'+i,kind:'magazine' as const,location
    }))??[]);
  const v4Slot=p.poseV4ReloadPreview&&reloadActive&&
    reloadMode!=='shells'?
    selectedReloadPouchSlot(v4Carry,p.reloadSelectedMagazineId,
      !p.reloadSelectedMagazineId):null;
  const v4Magazine=v4Slot?
    r.visualKit.magazines[v4Slot.location][v4Slot.index]:undefined;
  // The target is a real existing rig/belt/pocket magazine. No slot ->
  // no fake retrieval and no missing magazine conjured in the hand.
  // The authored magazine socket is fixed to gear/hip, not based on
  // last-frame world matrices (which broke same-time replay seeks).
  const v4PouchAnchor=v4Magazine?.visible?
    v4AuthoredPouchAnchor(v4Magazine,r.chest,r.hip)??undefined:
    undefined;
  r.root.userData.reloadV4MagazineSlot=v4Magazine?.visible?
    v4Slot:null;
  // B17 measured on the actual legacy-armored AKM: the compact outboard
  // magazine path clears more support-arm phases without extra solver probes.
  // Preserve the canonical route for all other kits, especially flak AKS74U.
  const legacyAkReload=p.poseV3Preview&&reloadActive&&
    coupledConfig?.build?.family==='ak'&&
    clothing.armorStyle==='plate-legacy';
  const v3MagazinePalm:V3MagazinePalm=p.poseV3Preview?
    (p.poseV3MagazinePalm??'legacy'):'legacy';
  const v3ReloadCorridor:V3ReloadCorridorProfile=p.poseV3Preview?
    (p.poseV3ReloadCorridor??(legacyAkReload?'compact':'canonical')):
    'canonical';
   if(!coupled&&upperBodyPlan.coordinatedEligible&&coupledConfig?.build){
    const activeReloadSocket=reloadActive?
      weaponPresentationSockets(p.weapon,p.weaponConfiguration):null;
    const envelope=poseEnvelope!;
    if(reloadActive)v3ReloadClearanceFront=envelope.front;
    const releaseInputs=reloadActive?{
      fit,lengthScale:data.lengthScale,
      progress:reloadProgress,mode:reloadMode,
      family:coupledConfig.build.family,corridor:v3ReloadCorridor,
      magazinePalm:v3MagazinePalm,
      supportX:data.supportX,supportY:data.supportY,
      primaryX:data.primaryX,clearanceFront:envelope.front,
      magazineSocket:activeReloadSocket?.magazinePart?
        activeReloadSocket.magazine:undefined,
      reloadControl:activeReloadSocket?.reloadControl,
      pickupTarget:v4PouchAnchor}:null;
    const releasedTarget=releaseInputs?(
      p.poseV4ReloadPreview?
        choreographV4ReloadHand(releaseInputs,
          reloadMechanismFor(p.weapon,coupledConfig)):
        choreographV3ReloadHand(releaseInputs)).target:undefined;
    const shoulders:[THREE.Vector3,THREE.Vector3]=[
      shoulderFor(0),shoulderFor(1)
    ];
    const constraintMode=reloadActive?'reload':
      p.aiming||handling==='ads'?'aim':'carry';
    const allowReloadOverlap=!!p.poseV4ReloadPreview&&reloadActive&&
      !p.poseV3StrictContact;
    const allowVisualOverlap=!!p.poseV3Preview&&!p.firing&&
      !p.poseV3StrictContact;
    // Both expensive fitting strategies are owned by one coordinated
    // authority; the pose renderer only consumes the selected result.
    const solve=cachedCoordinatedUpperBody(r,{
      fit,weapon:p.weapon,configuration:coupledConfig,shoulders,
      chestRotation:frame.chest.rotation,envelope,mode:constraintMode,
      releasedSupportTarget:releasedTarget,
      allowReloadOverlap,allowVisualOverlap
    });
    const result=solve.result;
    const cacheHit=solve.cached;
    r.root.userData.poseV3CoordinatedReport=diagnosticsEnabled?{
      cached:cacheHit===true,
      status:result.status,yaw:result.yaw,leanX:result.leanX,
      candidates:result.candidates,
      validCandidates:result.validCandidates,
      rejects:{...result.rejects},
      quality:result.quality,
      relaxedContact:!!result.reports?.some(report=>report.relaxedContact),
      strictContactValid:result.reports?.every(report=>
        report.strictContactValid)??false
    }:null;
    if(result.status==='clear'&&result.arms){
      coordinatedDynamic=result;
      fit=result.fit;
      // B8: identical math, reusable per-rig vector and quaternion.
      const offset=scratch.v3LeanOffset.set(result.leanX,0,0)
        .applyQuaternion(scratch.v3LeanRotation.setFromEuler(
          frame.chest.rotation));
      v3LeanParentX=offset.x;
      v3LeanParentY=offset.y;
      v3LeanParentZ=offset.z;
      // Existing body rotation is set afresh from pose time on every call.
      // Apply exactly one deterministic delta, not frame-history easing.
      frame.chest.rotation.y+=result.yaw;
    }
  }else r.root.userData.poseV3CoordinatedReport=null;
  // For a Lab switch, the destination solver above retains full authority:
  // in particular, low-ready must not fall back to the generic fitter.
  // Interpolate the rigid weapon once from the *visible* previous fit.
  // During the bridge, normal clearance-aware IK follows both hand sockets.
  // Retarget directly from the last displayed weapon; keep the
  // destination paired fit as the elbow-pole destination throughout
  // the blend, rather than swapping from generic IK to paired IK
  // on the final frame (the observed elbow snap).
  // Snapshot the DIRECT destination fit before interpolating the
  // presentation. An unresolved coordinated pose has no paired elbow:
  // its real destination is the accepted dynamic/legacy fallback.
  const authoredDestinationFit=fit;
  const authoredBridge=!manualShort&&authoredLabSwitch&&
    !!activeTransition?.authoredFrom&&activeTransition.alpha<1;
  if(authoredBridge)
    fit=interpolateWeaponCarry(activeTransition!.authoredFrom!,fit,
      activeTransition!.alpha);
  const carryTransition=manualShort?
    {fit,active:false,alpha:1,bends:null}:
    sampleCarryTransition(r,p,fit,!!coupled);
  fit=carryTransition.fit;
  const carryTransitionActive=carryTransition.active;
  const carryTransitionAlpha=carryTransition.alpha;
  const carryTransitionBends=carryTransition.bends;
  const carryTransitionHands=carryTransition.hands;
  r.gripError=fit.contactError;
  r.stockError=fit.stockError;
  // Contact coordinates and visible weapon use one rigid transform.
  heldWeapon.scale.set(data.lengthScale,1,1);
  droppedWeapon.scale.set(data.lengthScale,1,1);
  equipment.weaponEuler.copy(fit.rotation);
  heldWeapon.quaternion.setFromEuler(equipment.weaponEuler);
  heldWeapon.position.copy(fit.origin);
  if(p.poseV3Preview&&diagnosticsEnabled){
    // Snapshot the actual rendered rigid weapon, including any active
    // partially blended stance. The next Lab tap can retarget from here.
    r.root.userData.presentedWeaponFit={
      ...fit,origin:fit.origin.clone(),rotation:fit.rotation.clone(),
      stock:fit.stock.clone(),primary:fit.primary.clone(),
      support:fit.support.clone()
    } as WeaponFit;
  }else r.root.userData.presentedWeaponFit=null;
  // B29: visible HK lock/slap, AK handle rack and AR bolt-catch press.
  // Physically attached to the weapon, driven only by the action clock.
  // It never modifies fit, recoil, muzzle, shot state or inventory.
  const v4Control=p.poseV4ReloadPreview&&reloadActive?
    v4ReloadControlPose(reloadMechanismFor(p.weapon,coupledConfig),
      reloadMode,reloadProgress):null;
  const reloadControl=attachments[EAI.control];
  reloadControl.visible=!!v4Control?.visible&&!p.down&&!p.surrender;
  if(reloadControl.visible&&v4Control){
    const sock=weaponPresentationSockets(p.weapon,p.weaponConfiguration)
      .reloadControl;
    reloadControl.position.set(sock.x+v4Control.travel,sock.y,
      sock.z+v4Control.press);
    const mech=reloadMechanismFor(p.weapon,coupledConfig);
    reloadControl.scale.set(mech==='ar-bolt-catch'?.73:1,
      mech==='hk-roller'?1.15:1,mech==='ak-rocking'?.80:1);
  }
  // On ADS, bring the eyes toward the actual sight line, keeping the
  // firearm fixed. Head-only accommodation cannot change shot ballistics.
  frame.head.position.z=0;
  if(!p.unarmedPreview&&handling==='ads'&&!p.down&&!p.surrender){
    const strength=p.handlingOverride?1:
      clamp(p.aimBlend??(p.aiming?1:0),0,1);
    // Use the modeled eye anchor rather than a guessed secondary point.
    const eye=P(ANATOMY.eyeRight.x,
      frame.head.position.y+ANATOMY.eyeRight.y-ANATOMY.headRest.y,
      ANATOMY.eyeRight.z);
    const sight=P(-1*data.lengthScale,
      p.weaponConfiguration?resolveWeaponAssembly(p.weaponConfiguration).sightHeight:2.6,0)
      .applyEuler(fit.rotation).add(fit.origin);
    const ray=P(1,0,0).applyEuler(fit.rotation).normalize();
    const nearest=sight.addScaledVector(ray,
      eye.clone().sub(sight).dot(ray));
    // In the Lab the shoulder girdle and chest now help align the sight,
    // so the head should not have to crane dramatically toward the rifle.
    const maxHeadVertical=p.handlingOverride?1.65:2.2;
    const maxHeadLateral=p.handlingOverride?1.3:1.6;
    frame.head.position.y+=clamp(nearest.y-eye.y,
      -maxHeadVertical,maxHeadVertical)*strength;
    frame.head.position.z+=clamp(nearest.z-eye.z,
      -maxHeadLateral,maxHeadLateral)*strength;
  }
  const eye=P(ANATOMY.eyeRight.x,
    frame.head.position.y+ANATOMY.eyeRight.y-ANATOMY.headRest.y,
    ANATOMY.eyeRight.z+frame.head.position.z);
  const sight=P(-1*data.lengthScale,
    p.weaponConfiguration?resolveWeaponAssembly(p.weaponConfiguration).sightHeight:2.6,0)
    .applyEuler(fit.rotation).add(fit.origin);
  const axis=P(1,0,0).applyEuler(fit.rotation).normalize();
  const delta=eye.sub(sight);
  r.eyeError=delta.addScaledVector(axis,-delta.dot(axis)).length();
  // Weapon kick and muzzle flash may not break solved hand contacts.
  // A physical door reach may shift the chest a little over the support
  // foot, but the whole character is never allowed to tip like a rigid pole.
  const magazinePhase=reloadPhase(reloadProgress,reloadMode);
  const authoredMagazine=r.detachedMagazine.children.length>0;
  const mountedMagazine=!(p.reloadRemoved&&!p.reloadInserted)&&
    (!reloadActive||reloadProgress<.29||reloadProgress>=.82);
  // The authored family magazine and old fallback are mutually exclusive.
  attachments[EAI.inserted].visible=!authoredMagazine&&
    p.weapon!=='shotgun'&&mountedMagazine;
  for(const mesh of r.weaponBody.children)
    if(mesh.name.startsWith('family-magazine-'))mesh.visible=mountedMagazine;
  attachments[EAI.hand].visible=!authoredMagazine&&reloadActive&&
    magazinePhase!=='reach'&&magazinePhase!=='settle';
  attachments[EAI.detached].visible=authoredMagazine&&reloadActive&&
    !mountedMagazine&&magazinePhase!=='settle'&&!p.down&&!p.surrender;
  if(p.poseV4ReloadPreview&&reloadActive&&v4Magazine&&
    v4PouchAnchor){
    // Before pickup the identical magazine remains IN its visible pouch.
    // During the rendezvous the wrist is empty; only after extraction
    // does the new magazine become hand-owned. No duplicated magazine.
    if(!v4MagazineInHand(reloadProgress)){
      attachments[EAI.hand].visible=false;
      attachments[EAI.detached].visible=false;
    }
    if(!v4SelectedPouchVisible(reloadProgress)){
      v4Magazine.visible=false;
      r.root.userData.reloadV4HiddenSource=v4Magazine;
    }
  }
  attachments[EAI.hand].scale.set(
    p.weapon==='shotgun'?.48:1,p.weapon==='shotgun'?.55:1,1);
  // Body-assisted V3 preview keeps the firearm world-fixed by applying
  // the matching parent-space chest lean after the usual door/bashing reset.
  frame.chest.position.x=bash.reach*.18+v3LeanParentX;
  frame.chest.position.y+=v3LeanParentY;
  frame.chest.position.z+=v3LeanParentZ;
  if(authoredLabSwitch&&activeTransition?.authoredChest){
    const phase=lowReadyBlendPhase(activeTransition.alpha);
    if(phase<1){
      const from=activeTransition.authoredChest;
      const q0=scratch.poseBlendFrom.setFromEuler(from.rotation);
      const q1=scratch.poseBlendTo.setFromEuler(frame.chest.rotation);
      frame.chest.rotation.setFromQuaternion(q0.slerp(q1,phase),'XYZ');
      frame.chest.position.lerpVectors(from.position,frame.chest.position,phase);
    }
  }
  r.reachRequest=null;
  heldWeapon.visible=(!p.down&&!p.surrender)||downProgress<.30;
  droppedWeapon.visible=(p.down||p.surrender)&&downProgress>=.30;
  if(droppedWeapon.visible&&r.droppedWeaponBody.children.length===0){
    const buildStart=profilePose?performance.now():0;
    // Build the same real silhouette (including accessories) at the exact
    // first visible dropped frame. No delayed appearance, proxy geometry,
    // added shadow casters, or changed weapon sockets.
    const dropped=buildWeaponSilhouette(p.weapon,
      r.weaponSteel,r.weaponDark,config);
    r.droppedWeaponBody.userData.visibleStockContact=
      dropped.userData.visibleStockContact??null;
    while(dropped.children.length)
      r.droppedWeaponBody.add(dropped.children[0]);
    if(config){
      const accessories=buildWeaponAccessories(config,r.weaponSteel,
        r.weaponDark,r.weaponLensMaterial);
      while(accessories.children.length)
        r.droppedAccessories.add(accessories.children[0]);
    }
    r.droppedLightLens=
      r.droppedAccessories.getObjectByName('weapon-light-lens')??null;
    // Retain the original off-state even on this freshly constructed frame.
    if(r.droppedLightLens)r.droppedLightLens.visible=false;
    if(profilePose)weaponBuildMs+=performance.now()-buildStart;
  }
  const leftGrip=P(data.supportX,data.supportY,-1.6);
  const rightGrip=P(data.primaryX,data.primaryY,1.8);
  const releaseLeft=handOwners.left!=='weapon';
  const releaseRight=handOwners.right!=='weapon';
  let reaching=false;
  let reloadHandChest:THREE.Vector3|null=null;
  attachments[EAI.medical].visible=treatmentActive;
  let fullDoorContact:THREE.Vector3|null=null;
  if(p.surrender){
    // Deliberate visible surrender: discard the gun, kneel and raise both
    // hands overhead. Unlike an incapacitated actor this is not a fall.
    
    const raised=smooth(downProgress/.60);
    leftGrip.set(-1,3+15*raised,-7);
    rightGrip.set(-1,3+15*raised,7);
  }else if(p.down){
    // Support hand gives way first, then the firing hand releases.
    
    leftGrip.set(-3,-7,-8);rightGrip.set(-2,-8,8);
  }else if(treatmentActive){
    reaching=true;
    const target=p.treatmentPoint??{x:p.x+Math.cos(p.heading)*12,
      y:p.z+Math.sin(p.heading)*12};
    const local=P(target.x-p.x,12-frame.chest.position.y,target.y-p.z);
    local.applyAxisAngle(P(0,1,0),-r.legacyYaw);
    local.applyAxisAngle(P(0,1,0),-frame.chest.rotation.y);
    const reach=smooth((p.treatmentProgress??0)/.26);
    const left=fit.support.clone().lerp(local.clone().add(P(-1,3,-2)),reach);
    const right=fit.primary.clone().lerp(local.clone().add(P(1,3,2)),reach);
    leftGrip.copy(left);rightGrip.copy(right);
    attachments[EAI.medical].position.copy(left);
  }else if(reloadActive){
    
    const sockets=weaponPresentationSockets(p.weapon,p.weaponConfiguration);
    const hand=reloadHandKey(reloadProgress,reloadMode,
      data.supportX,data.supportY,data.primaryX,
      sockets.magazinePart?sockets.magazine:undefined);
    leftGrip.set(hand.x,hand.y,hand.z);
    const renderReloadInputs={
      fit,lengthScale:data.lengthScale,progress:reloadProgress,
      mode:reloadMode,family:coupledConfig?.build?.family,
      corridor:v3ReloadCorridor,magazinePalm:v3MagazinePalm,
      supportX:data.supportX,supportY:data.supportY,
      primaryX:data.primaryX,clearanceFront:v3ReloadClearanceFront,
      magazineSocket:sockets.magazinePart?sockets.magazine:undefined,
      reloadControl:sockets.reloadControl,
      pickupTarget:v4PouchAnchor
    };
    reloadHandChest=p.poseV3Preview?
      (p.poseV4ReloadPreview?
       choreographV4ReloadHand(renderReloadInputs,
        reloadMechanismFor(p.weapon,coupledConfig)):
       choreographV3ReloadHand(renderReloadInputs)).target:
      reloadHandChestTarget({
        fit,lengthScale:data.lengthScale,progress:reloadProgress,
        mode:reloadMode,supportX:data.supportX,supportY:data.supportY,
        primaryX:data.primaryX,
        magazineSocket:sockets.magazinePart?sockets.magazine:undefined
      });
  }else if(throwActive){
    
    // A1: timeline-sampled visual gesture only. Hand ownership, simulated
    // throw/release, world trajectory and actor intent remain untouched.
    const gesture=throwSupportGesture(throwAge);
    leftGrip.set(data.supportX+gesture.forward,4+gesture.lift,-7);
  }else if(p.surrender){
    
    const raised=smooth(downProgress/.60);
    leftGrip.set(-1,3+15*raised,-6);
    rightGrip.set(-1,3+15*raised,6);
  }else if(bash.active&&p.bashRole==='push'){
    // A short forearm/shoulder extension separates the opponent, while
    // the primary hand keeps the gun from flailing through the torso.
    
    leftGrip.set(data.supportX+bash.reach*2,-4,-6);
  }else if(!p.down&&p.injury>0&&
    p.hitRegion!=='leg'&&!p.aiming&&!p.firing&&
    p.hitAge!==undefined&&p.hitAge>=0&&p.hitAge<1.1){
    // Only release the support grip to guard a fresh injury when the
    // operator is not actively aiming or already using that hand.
    
    const progress=Math.sin(Math.PI*clamp(p.hitAge/1.1,0,1));
    leftGrip.set(3+progress*2,-5,-5);
  }else if(doorActive&&(p.doorGrip||p.doorPoint)){
    reaching=true;
    const doorTarget=gripWeight>0&&p.doorGrip?
      p.doorGrip.point:p.doorPoint!;
    const local=P(doorTarget.x-p.x,19-frame.chest.position.y,
      doorTarget.y-p.z);
    local.applyAxisAngle(P(0,1,0),-r.legacyYaw);
    local.applyAxisAngle(P(0,1,0),-frame.chest.rotation.y);
    // Deliberate hand-off: release weapon, reach physical handle, and
    // return the support hand to its real gun grip after the latch moves.
    // D4: the real support hand follows the moving panel for the whole
    // physically retained interval. The same IK solver, not a second arm
    // controller, performs the reach and blended return to the weapon.
    const reach=gripWeight>0?gripWeight:
      p.lockpickActive?smooth(doorAge/.32):
      smooth(doorAge/.32)*(1-smooth((doorAge-.62)/.48));
    // Sustained D4 contact is an independent support arm, NOT a new
    // chest/weapon transform. The authoritative firing hand and muzzle
    // stay fixed while the left hand tracks a moving leaf. Retain the
    // legacy one-shot lean only for explicit non-grip interactions.
    const lean=gripWeight>0?0:clamp(local.x-13,0,2.4)*reach;
    if(gripWeight<=0)frame.chest.position.x=lean;
    fullDoorContact=local.sub(P(lean,0,0)).clone();
    leftGrip.copy(fit.support).lerp(fullDoorContact,reach);
    if(p.lockpickActive){
      const phase=(p.lockpickProgress??0)*Math.PI*20;
      leftGrip.x+=Math.sin(phase)*.72*reach;
      leftGrip.y+=Math.cos(phase)*.34*reach;
    }
  }
  // Preview-only evaluation; production continues to use the proven path.
  const dynamicEnvelope=p.poseV3Preview?poseEnvelope:null;
  const v3DynamicReports:Array<{
    side:string;status:string;reason:string;
    candidates:number;elbowDrop:number;outwardFlare:number;
    hardDepth:number;quality:number;
    reachError:number;violations:string[];
    evaluations:number;softScale:number;
  }>|null=diagnosticsEnabled?[]:null;
  // The base hold is calculated from the very same ready/aim source used
  // by shot-time geometry. No previous-frame elbow memory; replay is pure.
  const manualCarry=(handling==='high'||handling==='low')&&
    !p.unarmedPreview&&!p.down&&!p.surrender&&!reloadActive&&
    !treatmentActive&&!throwActive&&!doorActive&&
    !p.traversalProgress&&!p.firing&&
    p.handlingIntent!=='run'&&p.handlingIntent!=='traverse'&&
    handOwners.left==='weapon'&&handOwners.right==='weapon';
  const manualPhase=manualShort?authoredShortPhase(manualRaw):
    manualCarry&&carryTransitionActive?carryTransitionAlpha:
    manualCarry&&activeTransition?
      lowReadyBlendPhase(activeTransition.alpha):1;
  const manualPose=manualShort?
    liveShortStockPose(p.weapon,p.weaponConfiguration):
    manualCarry?liveReadyCarryPose(handling as 'high'|'low',
      p.weapon,p.weaponConfiguration):null;
  const manualSource=manualShort?
    shortStockSourceHandling(p.aimBlend??(p.aiming?1:0),moving,
      p.weapon,!!p.friendlyNear):'ready';
  const manualSourceFit=manualPose?fitWeaponPose({
    weapon:p.weapon,configuration:p.weaponConfiguration,
    handling:manualSource,
    yaw:p.handlingOverride==='short'?0:relativeYaw,recoil,
    armorPush:equipmentStockPush(p.equipment),
    aimBlend:p.handlingOverride?undefined:
      p.aimBlend??(p.aiming?1:0)}):null;
  // Stored Euler and XYZ targets are **exactly** the user's Lab export.
  // In a moving scene rotate wrist/bend targets around the stock when
  // facing relative to the chest changes; shoulders remain anatomical.
  const authoredPoint=(key:'supportHand'|'firingHand'|
      'supportElbow'|'firingElbow')=>{
    const start=new THREE.Vector3(...manualPose!.targets.stock);
    return new THREE.Vector3(...manualPose!.targets[key])
      .sub(start).applyAxisAngle(P(0,1,0),
        p.handlingOverride==='short'||authoringCarry?
          0:relativeYaw).add(manualCarry?fit.stock:start);
  };
  if((manualShort&&p.handlingOverride==='short'||manualCarry&&
      !!p.handlingOverride)&&physicalSpeed<.2){
    // Match the static workbench silhouette without altering the battle's
    // upper-body recoil/turn authority. This tiny torso adjustment only
    // runs for the explicitly selected stationary Lab stance.
    const angles=manualPose!.torso;
    frame.chest.rotation.x=THREE.MathUtils.lerp(frame.chest.rotation.x,
      THREE.MathUtils.degToRad(angles[0]),manualPhase);
    frame.chest.rotation.y=THREE.MathUtils.lerp(frame.chest.rotation.y,
      THREE.MathUtils.degToRad(angles[1]),manualPhase);
    frame.chest.rotation.z=THREE.MathUtils.lerp(frame.chest.rotation.z,
      THREE.MathUtils.degToRad(angles[2]),manualPhase);
  }
  const manualReport=manualShort?{
    progress:manualPhase,preset:manualPose!.preset,
    handTargets:'manual',solver:'single-two-bone',
    stock:fit.stock.toArray()}:null;
  r.root.userData.authoredShortStock=manualReport;
  r.root.userData.authoredReadyCarry=manualCarry?{
    mode:handling,source:manualPose!.preset,progress:manualPhase,
    stock:fit.stock.toArray(),contactGap:fit.contactError,
    solver:'user-workbench-two-bone'
  }:null;
  // Preserve the old M4-specific diagnostic only for exact M4A1 poses.
  r.root.userData.authoredM4ShortStock=
    manualReport&&manualPose!.preset==='ar-m4a1'&&
      p.weapon==='carbine'?manualReport:null;
  beginOperatorArmPose(r,scratch);
  for(let i=0;i<2;i++){
    const sign=i===0?-1:1,arm=r.arms[i];
    if((manualShort||manualCarry)&&manualSourceFit){
      const startShoulder=shoulderFor(i);
      const targetShoulder=new THREE.Vector3(
        ...manualPose!.targets[
          i===0?'supportShoulder':'firingShoulder']);
      const shoulder=startShoulder.clone().lerp(targetShoulder,manualPhase);
      const oldWrist=carryTransitionActive&&carryTransitionHands?
        carryTransitionHands[i]:
        i===0?manualSourceFit.support:manualSourceFit.primary;
      const requested=authoredPoint(i===0?'supportHand':'firingHand');
      const wrist=oldWrist.clone().lerp(requested,manualPhase);
      const normalProfile=handlingProfile(manualSource,p.weapon);
      const natural=elbowCorridor(manualSource,
        sign as -1|1,normalProfile);
      const elbowGuide=P(natural.x,natural.y,natural.z).lerp(
        authoredPoint(i===0?'supportElbow':'firingElbow'),manualPhase);
      // This is the SAME simple 10+10 IK as the workbench. The author's
      // elbow is a bend POLE, never an independently displaced joint.
      // No armor re-ranking, no backward-elbow hemisphere guard, no
      // legacy fallback or second IK pass can override the result.
      const solved=solveTwoBone(shoulder,wrist,10,10,
        elbowGuide.sub(shoulder),ARM_LIMITS);
      r.elbowSpread[i]=Math.max(0,
        sign*(solved.joint.z-shoulder.z));
      arm.bend.copy(solved.bendPlane);
      arm.outOfReach=!solved.reached;
      setOperatorArmSegments(scratch,i as 0|1,
        shoulder,solved.joint,solved.effector,scratch.sides[i]);
      setOperatorHandPose(scratch,i as 0|1,solved.effector,
        fit.rotation.y);
      r.gripError=Math.max(r.gripError,
        solved.effector.distanceTo(i===0?fit.support:fit.primary));
      continue;
    }
    const shoulder=shoulderFor(i);
    const sourceArm=authoredLabSwitch?
      activeTransition?.authoredArms?.[i]:undefined;
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
      desired=treatmentActive&&releaseRight?rightGrip.clone():fit.primary.clone();
    }else{
      desired=grip.clone().multiply(P(data.lengthScale,1,1))
        .applyEuler(fit.rotation).add(fit.origin);
      if(i===0&&reloadHandChest)desired.copy(reloadHandChest);
    }
    if(carryTransitionActive&&carryTransitionHands)
      desired.copy(carryTransitionHands[i]).lerp(
        desired,carryTransitionAlpha);
    // At phase zero reproduce the *exact* displayed source anatomy.
    // Subsequent frames are resolved from a continuous source elbow pole.
    if(sourceArm&&activeTransition!.alpha<=0){
      r.elbowSpread[i]=Math.max(0,
        sign*(sourceArm.elbow.z-shoulder.z));
      arm.bend.copy(sourceArm.bend);arm.outOfReach=false;
      setOperatorArmSegments(scratch,i as 0|1,
        shoulder,sourceArm.elbow,sourceArm.wrist,scratch.sides[i]);
      setOperatorHandPose(scratch,i as 0|1,sourceArm.wrist,
        clamp(fit.rotation.y,-1,1));
      continue;
    }
    // One final writer consumes either approved paired-arm source.
    // Coupled low-ready wins first (as before), followed by coordinated
    // V3 arms. Only when neither owns the pair does generic IK run.
    // No second IK pass may undo a validated elbow/armor solution.
    const destinationArms=coupled?.arms??coordinatedDynamic?.arms??null;
    const pairedArms=!carryTransitionActive&&!authoredBridge&&
      !p.unarmedPreview?destinationArms:null;
    if(pairedArms){
      const limb=pairedArms[i];
      r.elbowSpread[i]=Math.max(0,sign*(limb.joint.z-shoulder.z));
      arm.bend.copy(limb.bendPlane);
      arm.outOfReach=false;
      setOperatorArmSegments(scratch,i as 0|1,
        shoulder,limb.joint,limb.effector,scratch.sides[i]);
      setOperatorHandPose(scratch,i as 0|1,limb.effector,
        clamp(fit.rotation.y,-1,1));
      if(!coupled&&coordinatedDynamic?.arms){
        const report=coordinatedDynamic.reports![i];
        v3DynamicReports?.push({
          side:i===0?'support':'firing',status:'clear',reason:'valid',
          candidates:6,elbowDrop:report.elbowDrop,
          outwardFlare:report.outwardFlare,
          hardDepth:report.hardDepth,quality:report.quality,
          reachError:0,violations:[],
          evaluations:6,softScale:coordinatedDynamic.softScales![i]
        });
      }
      continue;
    }
    const neutralArms=!!p.unarmedPreview&&!p.down&&!p.surrender;
    if(neutralArms)
      desired=neutralMannequinWrist(sign as -1|1);
    const reachable=desired.distanceTo(shoulder)<=19.92;
    // Evaluate the true handle target even during the wind-up: easing the
    // arm from the weapon must not hide an unreachable world interaction.
    const contactDistance=i===0&&fullDoorContact?
      fullDoorContact.distanceTo(shoulder):0;
    if(i===0&&reaching&&(!reachable||contactDistance>19.92))
      r.reachRequest={kind:'door',distance:Math.max(
        desired.distanceTo(shoulder),contactDistance)};
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
    const curatedSupport=i===0&&!releaseLeft&&relaxedLowReady>.08&&familyLow;
    const familyPole=curatedSupport?
      lowReadyElbowPole(shoulder,familyLow,0):null;
    const wanted=neutralArms?neutralMannequinElbowPole(sign as -1|1):
      familyPole?P(familyPole.x,familyPole.y,familyPole.z):
      P(corridor.x,corridor.y,corridor.z).sub(shoulder);
    if(carryTransitionActive&&carryTransitionBends){
      const destination=coupled?coupled.arms[i].bendPlane:wanted;
      wanted.copy(carryTransitionBends[i])
        .lerp(destination,carryTransitionAlpha).normalize();
    }
    if(sourceArm&&activeTransition){
      // One direct, contact-constrained arc from the displayed elbow
      // toward the actual destination solver's preferred bend. There
      // is no intermediate 'ready' elbow, nor a new elbow at completion.
      let targetJoint=destinationArms?.[i]?.joint;
      if(authoredBridge&&!targetJoint){
        // The coordinated search can reject a heavy or close-quarters
        // kit (notably SHORT). Compute the *same* finite fallback arm
        // as the final settled frame and make that the transition's
        // elbow destination. Never retarget to a guessed generic pole,
        // then jump to the actual dynamic candidate at alpha=1.
        const base=i===0?ANATOMY.shoulderLeft:ANATOMY.shoulderRight;
        const endProfile=handlingProfile(handling,p.weapon);
        const shoulderWeight=handling==='low'&&
          !!p.weaponConfiguration?.build?0:poseWeight;
        const targetShoulder=P(
          base.x+shoulderWeight*(i===0?
            endProfile.supportShoulderForward:
            endProfile.firingShoulderForward),
          base.y+shoulderWeight*endProfile.shoulderLift,
          base.z-sign*shoulderWeight*endProfile.shoulderInward);
        const endWrist=i===0?authoredDestinationFit.support:
          authoredDestinationFit.primary;
        const endCorridor=elbowCorridor(handling,sign as -1|1,endProfile);
        const targetPole=P(endCorridor.x,endCorridor.y,endCorridor.z)
          .sub(targetShoulder);
        const settled=solveUnifiedFallbackArm({
          shoulder:targetShoulder,
          wrist:clampReach(targetShoulder,endWrist,19.92),
          desired:endWrist,preferredPole:targetPole,
          previousBend:P(3,-9,sign*.5),side:sign as -1|1,
          neutral:false,down:false,surrender:false,firing:false,
          sourceContinuity:false,envelope:dynamicEnvelope,
          outboardFiring:handling==='short'&&i===1,
          mode:handling==='ads'?'aim':'carry',
          allowVisualOverlap:!!p.poseV3Preview&&
            !p.poseV3StrictContact,
          curatedSupport:false,familyLow,
          legacyFront:p.equipment?.slots.armor==='armor-carrier'?9.8:
            p.equipment?.slots.armor==='armor-soft'?8.8:7.1,
          scratch,armIndex:i as 0|1
        });
        // Scratch results are reused by the current arm after this.
        // Copy only the pure target coordinate.
        targetJoint=settled.solution.joint.clone();
      }
      const toJoint=targetJoint??shoulder.clone().add(wanted);
      wanted.copy(continuousElbowPole(shoulder,wrist,
        sourceArm.elbow,toJoint,sign as -1|1,
        lowReadyBlendPhase(activeTransition.alpha)));
    }
    const armFit=solveUnifiedFallbackArm({
      shoulder,wrist,desired,preferredPole:wanted,
      previousBend:sourceArm?.bend??arm.bend,
      side:sign as -1|1,
      neutral:neutralArms,down:p.down,surrender:p.surrender,
      firing:p.firing,
      sourceContinuity:!!sourceArm&&!!activeTransition&&
        activeTransition.alpha<1,
      transitionPhase:activeTransition?.alpha,
      liveContinuity:!p.deterministic&&!discontinuity&&!!r.lastPose&&
        !reloadActive&&!reaching&&!p.firing,
      outboardFiring:handling==='short'&&i===1,
      envelope:dynamicEnvelope,
      mode:reloadActive?'reload':p.aiming||handling==='ads'?
        'aim':reaching||throwActive?'interaction':'carry',
      allowVisualOverlap:!!p.poseV3Preview&&!p.firing&&
        !p.poseV3StrictContact,
      curatedSupport:!!curatedSupport,familyLow,
      legacyFront:p.equipment?.slots.armor==='armor-carrier'?9.8:
        p.equipment?.slots.armor==='armor-soft'?8.8:7.1,
      scratch,armIndex:i as 0|1
    });
    const solved=armFit.solution;
    if(armFit.dynamic){
      const dynamic=armFit.dynamic;
      v3DynamicReports?.push({side:i===0?'support':'firing',
        status:dynamic.status,reason:dynamic.reason,
        candidates:dynamic.candidates,
        elbowDrop:dynamic.report.elbowDrop,
        outwardFlare:dynamic.report.outwardFlare,
        hardDepth:dynamic.report.hardDepth,
        quality:dynamic.report.quality,
        reachError:Math.max(0,desired.distanceTo(shoulder)-19.92),
        violations:[...dynamic.report.reasons],
        evaluations:dynamic.evaluations,softScale:dynamic.softScale});
    }
    r.elbowSpread[i]=Math.max(0,
      sign*(solved.joint.z-shoulder.z));
    arm.bend.copy(solved.bendPlane);
    arm.outOfReach=!reachable||!solved.reached||
      (i===0&&reaching&&contactDistance>19.92);
    if(!releaseLeft&&i===0)r.gripError=Math.max(r.gripError,
      desired.distanceTo(solved.effector));
    if(i===1&&!p.surrender)r.gripError=Math.max(r.gripError,
      desired.distanceTo(solved.effector));
    setOperatorArmSegments(scratch,i as 0|1,
      shoulder,solved.joint,solved.effector,scratch.sides[i]);
    setOperatorHandPose(scratch,i as 0|1,solved.effector,
      p.unarmedPreview||p.surrender?0:clamp(fit.rotation.y,-1,1));
  }
  r.root.userData.poseV3DynamicReport=p.poseV3Preview&&diagnosticsEnabled?
    v3DynamicReports:null;
  // AK rock-in is local to the detached magazine and the gripping palm.
  // No mounted mesh, ballistic transform or gameplay magazine state changes.
  const v3MagazineRock=p.poseV3Preview&&reloadActive?
    v3MagazineRockAngle(reloadProgress,reloadMode,
      coupledConfig?.build?.family):0;
  if(v3MagazineRock&&attachments[EAI.detached].visible)
    rotateOperatorSupportHand(scratch,v3MagazineRock);
  if(attachments[EAI.hand].visible){
    // Magazine visual follows the *solved* support wrist. The original
    // magazine is hidden from the gun while it is in hand.
    const handMagazine=attachments[EAI.hand];
    handMagazine.position.copy(operatorHandTransform(scratch,0).position);
    equipment.magHandEuler.copy(operatorHandEuler(scratch,0));
    handMagazine.quaternion.setFromEuler(equipment.magHandEuler);
  }
  if(attachments[EAI.detached].visible){
    // Meshes are magazine-feed-socket relative; the lips follow the
    // solved support wrist and return to their gun mount at insertion.
    const magazine=attachments[EAI.detached];
    magazine.position.copy(operatorHandTransform(scratch,0).position);
    equipment.detachedEuler.copy(fit.rotation);
    magazine.quaternion.setFromEuler(equipment.detachedEuler);
    if(v3MagazineRock){
      equipment.rotationZ.setFromAxisAngle(EQUIPMENT_LOCAL_Z,v3MagazineRock);
      magazine.quaternion.multiply(equipment.rotationZ);
    }
    magazine.scale.set(data.lengthScale,1,1);
    // Detached magazine meshes are authored relative to FEED LIPS.
    // The palm may now wrap the magazine BODY, several units below the
    // lips. Keep the feed-lip origin rigidly offset from that real palm.
    if(p.poseV3Preview&&reloadActive&&coupledConfig?.build){
      const palm=v3MagazineBodyGrip(coupledConfig.build.family,
        v3MagazinePalm);
      if(palm){
        palm.x*=data.lengthScale;
        palm.applyQuaternion(magazine.quaternion);
        magazine.position.sub(palm);
      }
    }
  }
  // B4: six arm/hand local transforms are staged directly after every
  // authored, coupled, coordinated, interaction and reload adjustment.
  // No arm mesh is mutated before the single B2 frame commit.
  stageDirectOperatorPoseOutput(r,p,'upper-body',
    finishOperatorArmPose(scratch));
  applyOperatorTraumaPose(r,p,downProgress,frame);
  // Same-frame held/drop world placement without temporary weapon node writes.
  solveOperatorDroppedWeapon(workingRig,p,scratch,downProgress,smooth);
  solveOperatorDirectSlingPose(workingRig,p,scratch,physicalSpeed);
  finishOperatorPoseFrame(r,p,
    scratch.armOutput.transforms[0].quaternion,
    scratch.armOutput.transforms[3].quaternion,equipment);
  // B6: every registered owner now submits direct typed output.
  // The working frame remains invisible until the single B2 commit.
  const finalFrame=finishOperatorFramePose(frame);
  stageDirectOperatorPoseOutput(r,p,'frame',finalFrame.frameOutputs);
  stageDirectOperatorPoseOutput(r,p,'body',finalFrame.bodyOutputs);
  const finalEquipment=finishOperatorEquipmentPose(scratch);
  stageDirectOperatorPoseOutput(r,p,'weapon',finalEquipment.weaponOutputs);
  stageDirectOperatorPoseOutput(r,p,'attachments',
    finalEquipment.attachmentOutputs);
  // Exactly one commit of the six validated, rig-local output stages.
  commitOperatorPoseOutput(r,p);
  if(profilePose){
   const total=performance.now()-poseStart;
   // 'other' includes gait, arm constraints, IK and transform publication;
   // this breakdown is CPU wall time, not GPU time or simulation physics.
   const kitBreakdown=r.root.userData.fieldworkAppearanceCpu as
    {visualKitMs:number;receiverAtlasMs:number}|undefined;
   r.root.userData.fieldworkPoseCpu={
    appearanceMs,weaponBuildMs,
    otherMs:Math.max(0,total-appearanceMs-weaponBuildMs),
    visualKitMs:kitBreakdown?.visualKitMs??0,
    receiverAtlasMs:kitBreakdown?.receiverAtlasMs??0
   };
  }
}
