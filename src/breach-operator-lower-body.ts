/** Stage 11: sole consumer of authoritative footstep contact scheduling.
 * Visual IK cannot teleport planted feet, modify motor position, or decide a
 * new footfall. Replay uses recorded targets, not accumulated render state.
 */
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import type {OperatorPoseScratch} from './breach-operator-pose-scratch.ts';
import {advanceFootsteps,validatedReplayFeet,type FootstepInput,type FootTarget}
 from './breach-footsteps.ts';
import {kickMotion} from './breach-door-actions.ts';
import {solveTwoBone,LEG_LIMITS,alignSegmentComponents} from './breach-ik.ts';
import {LEG_HIP_SIDE,LEG_ANKLE_HEIGHT,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,
 legMaximumLength} from './breach-leg-geometry.ts';

export function sampleOperatorFootContacts(
 r:OperatorRig,p:OperatorPose,physicalSpeed:number,moving:number,
 travelYaw:number):[FootTarget,FootTarget]{
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

 return targets;
}

/** B3: sole lower-body pose solver and contact consumer.
 * Solve both legs into reusable component transforms and the B2 typed slots.
 * The actual leg scene nodes are untouched until the single final pose
 * commit; the authoritative scheduler is never advanced inside this solver.
 * Body transforms are already evaluated in the legacy +X local basis.
 */
export function applyOperatorLegIK(r:OperatorRig,p:OperatorPose,
 scratch:OperatorPoseScratch,targets:[FootTarget,FootTarget],
 kick:ReturnType<typeof kickMotion>|null,headingYaw:number,
 smooth:(t:number)=>number){
 // Keep the published B3 call contract; kick phases are already eased.
 void smooth;
 const output=scratch.legOutput;
 // Preserve initial per-rig geometry/visibility/rotation, including the
 // hidden ankle cuff's last transform. Never create scene nodes or buffers
 // per frame; after initialization the lower-body outputs are the authority.
 if(!output.initialized){
  for(let i=0;i<2;i++){
   const foot=r.feet[i];
   const nodes=[foot.upper,foot.lower,foot.shoe,foot.ankleLink];
   for(let j=0;j<4;j++){
    const source=nodes[j],dest=output.transforms[i*4+j];
    dest.position.copy(source.position);
    dest.quaternion.copy(source.quaternion);
    dest.scale.copy(source.scale);
    dest.visible=source.visible;
   }
   output.shoeRotation[i].copy(foot.shoe.rotation);
  }
  output.initialized=true;
 }
 const bodyInverse=scratch.bodyInverse.setFromEuler(
  scratch.bodyEuler.set(r.legacyPitch,r.legacyYaw,r.legacyRoll,'XYZ')).invert();
 for(let i=0;i<2;i++){
  const foot=r.feet[i],sign=i===0?-1:1,target=targets[i];
  const upper=output.transforms[i*4],lower=output.transforms[i*4+1];
  const shoe=output.transforms[i*4+2],ankle=output.transforms[i*4+3];
  // The unarmed pelvis may shift a small distance over the bearing foot.
  // Resolve the thigh from that SAME visible hip location; solving from
  // x=0 while displaying a forward-shifted pelvis tears the anatomy.
  // Armed rigs retain their original calibrated leg origin.
  const hipLocal=scratch.hips[i].set(
    p.unarmedPreview?r.hip.position.x:0,r.hip.position.y,
    r.hip.position.z+sign*LEG_HIP_SIDE);
  const anchor=target.position;
  foot.anchor.set(anchor.x,LEG_ANKLE_HEIGHT,anchor.y);
  // These flags are diagnostics/IK continuity, not scene transforms.
  if(p.deterministic)foot.bend.set(1,0,0);
  foot.swinging=!target.contact;
  const targetWorld=scratch.targets[i].set(target.position.x,
    LEG_ANKLE_HEIGHT+target.height,target.position.y);
  // A recorded kick remains visible even in legacy frames without a
  // selected foot. This does not change simulation impact or reach.
  const kicking=!!kick&&i===(p.kickFoot??1);
  if(kicking&&kick){
   // Chamber without unplanting the support foot. At .53 the sole touches
   // the fixed, SIMULATION-RECORDED leaf point; the hinge never owns it.
   const release=1-kick.retract;
   targetWorld.y+=3.8*kick.chamber*(1-kick.strike)*release;
   const forwardX=Math.cos(p.heading),forwardZ=Math.sin(p.heading);
   const point=p.kickImpactPoint;
   const dx=point?point.x-p.x:forwardX;
   const dz=point?point.y-p.z:forwardZ;
   const length=Math.hypot(dx,dz)||1;
   const nx=dx/length,nz=dz/length;
   // Older replay films without a fixed impact anchor follow a forward
   // anatomical kick, NEVER the current (rotating) door leaf.
   const contact=point?scratch.kickContact.set(
    point.x-nx*1.5,9,point.y-nz*1.5):
    scratch.kickContact.set(
     target.position.x+nx*11.7,9,target.position.y+nz*11.7);
   targetWorld.lerp(contact,kick.strike*release);
   // After impact, the foot continues in the original kick direction by
   // a SMALL amount while the leaf swings away under its own physics.
   targetWorld.x+=nx*2.15*kick.followThrough*release;
   targetWorld.z+=nz*2.15*kick.followThrough*release;
   foot.swinging=release>0&&(kick.chamber>0||kick.strike>0);
  }
  const relative=scratch.relative[i].copy(targetWorld)
    .sub(scratch.rootPoint.set(p.x,r.root.position.y,p.z))
    .applyQuaternion(bodyInverse);
  if(kicking){
   // Bound the *boot*, not only the knee solver. Otherwise solveTwoBone
   // correctly stops at max extension while the shoe/ankle-link is still
   // drawn at the unreachable door target (the rubber-leg artifact).
   const offset=scratch.kickContact.copy(relative).sub(hipLocal);
   const length=offset.length();
   const maxReach=legMaximumLength()-.35;
   if(length>maxReach)
    relative.copy(hipLocal).addScaledVector(offset,maxReach/length);
  }
  const leg=solveTwoBone(hipLocal,relative,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,
    scratch.legPoles[i],LEG_LIMITS,foot.bend,scratch.legs[i]);
  foot.bend.copy(leg.bendPlane);
  foot.outOfReach=!leg.reached;
  // Never shift a scheduled foot to hide an unreachable knee. The tiny
  // additional visual cuff retains its existing gap threshold.
  r.legGap[i]=leg.effector.distanceTo(relative);
  alignSegmentComponents(upper.position,upper.quaternion,upper.scale,
    hipLocal,leg.joint,scratch.sides[i]);
  alignSegmentComponents(lower.position,lower.quaternion,lower.scale,
    leg.joint,leg.effector,scratch.sides[i]);
  ankle.visible=r.legGap[i]>.10;
  if(ankle.visible)
   alignSegmentComponents(ankle.position,ankle.quaternion,ankle.scale,
    leg.effector,relative,scratch.sides[i]);
  shoe.position.copy(relative);
  const angles=output.shoeRotation[i];
  angles.z=target.pitch??0;
  angles.y=target.worldYaw-headingYaw;
  shoe.quaternion.setFromEuler(angles);
 }
 // Copy values into stable, owner-registered slot tuples. The publication
 // layer checks finite data and accepts only all eight slots as a unit.
 for(let j=0;j<output.transforms.length;j++){
  const t=output.transforms[j],v=output.outputs[j].values;
  v[0]=t.position.x;v[1]=t.position.y;v[2]=t.position.z;
  v[3]=t.quaternion.x;v[4]=t.quaternion.y;
  v[5]=t.quaternion.z;v[6]=t.quaternion.w;
  v[7]=t.scale.x;v[8]=t.scale.y;v[9]=t.scale.z;
  v[10]=t.visible?1:0;
 }
 return output.outputs;
}
