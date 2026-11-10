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
import {solveTwoBone,LEG_LIMITS,alignSegment} from './breach-ik.ts';
import {LEG_HIP_SIDE,LEG_ANKLE_HEIGHT,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH}
 from './breach-leg-geometry.ts';

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

/** Sole leg mesh and IK writer; consumes—not revises—scheduled contacts.
 * Body orientation is committed beforehand so roots are evaluated in the
 * same transform space as the original direct-rig implementation.
 */
export function applyOperatorLegIK(r:OperatorRig,p:OperatorPose,
 scratch:OperatorPoseScratch,targets:[FootTarget,FootTarget],
 kick:ReturnType<typeof kickMotion>|null,headingYaw:number,
 smooth:(t:number)=>number){
 const bodyInverse=scratch.bodyInverse.setFromEuler(
  scratch.bodyEuler.set(r.legacyPitch,r.legacyYaw,r.legacyRoll,'XYZ')).invert();
  for(let i=0;i<2;i++){
    const foot=r.feet[i],sign=i===0?-1:1,target=targets[i];
    const hipLocal=scratch.hips[i].set(0,r.hip.position.y,
      r.hip.position.z+sign*LEG_HIP_SIDE);
    const anchor=target.position;
    foot.anchor.set(anchor.x,LEG_ANKLE_HEIGHT,anchor.y);
    // Replay seeks must never inherit a pole fallback from another time.
    if(p.deterministic)foot.bend.set(1,0,0);
    foot.swinging=!target.contact;
    const targetWorld=scratch.targets[i].set(target.position.x,
      LEG_ANKLE_HEIGHT+target.height,target.position.y);
    if(i===1&&kick){
      const motion=smooth((kick.progress-.30)/.23)*
        (1-smooth((kick.progress-.67)/.25));
      if(p.doorPoint){
        const dx=p.x-p.doorPoint.x,dz=p.z-p.doorPoint.y;
        const gap=Math.hypot(dx,dz)||1;
        // The boot IK solves toward the door's REAL leaf, not a generic
        // forward kick animation that can miss the panel entirely.
        const contact=scratch.kickContact.set(p.doorPoint.x+dx/gap*1.5,9,
          p.doorPoint.y+dz/gap*1.5);
        targetWorld.lerp(contact,motion);
      }else{
        targetWorld.x+=Math.cos(p.heading)*kick.reach;
        targetWorld.z+=Math.sin(p.heading)*kick.reach;
        targetWorld.y+=kick.lift;
      }
      foot.swinging=true;
    }
    const relative=scratch.relative[i].copy(targetWorld)
      .sub(scratch.rootPoint.set(p.x,r.root.position.y,p.z))
      .applyQuaternion(bodyInverse);
    const leg=solveTwoBone(hipLocal,relative,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,
      scratch.legPoles[i],LEG_LIMITS,foot.bend,scratch.legs[i]);
    // An unreachable leg reports a gap. Never move the boot independently
    // of its contact schedule: recoveries are requested by the scheduler.
    foot.bend.copy(leg.bendPlane);
    foot.outOfReach=!leg.reached;
    // The boot follows the scheduled contact, so report the anatomical
    // ankle separation for tuning rather than silently hiding it.
    r.legGap[i]=leg.effector.distanceTo(relative);
    // Contact remains in world space. Unreachable limbs report a constraint
    // violation instead of spinning the knee or teleporting their boot.
    alignSegment(foot.upper,hipLocal,leg.joint,scratch.sides[i]);
    alignSegment(foot.lower,leg.joint,leg.effector,scratch.sides[i]);
    // Final small reach extension is represented by a boot-colored
    // articulated ankle cuff, never a floating shoe or stretched shin.
    // The original two-bone segment lengths remain unchanged.
    foot.ankleLink.visible=r.legGap[i]>.10;
    if(foot.ankleLink.visible)
      alignSegment(foot.ankleLink,leg.effector,relative,scratch.sides[i]);
    foot.shoe.position.copy(relative);
    const pitch=target.pitch??0;
    foot.shoe.rotation.z=pitch;
    // The shoe's world-space anchor remains authoritative even while its
    // visual box rocks around the local center.
    // A boot rotates only during its scheduled swing, not with the pelvis.
    foot.shoe.rotation.y=target.worldYaw-headingYaw;
  }

}
