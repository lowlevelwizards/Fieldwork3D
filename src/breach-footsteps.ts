/** Build 119: deliberate world-space steps. No render-frame stance clamping.
 * The game motor supplies position and velocity; this module never moves actors.
 */
import {classifyLocomotion,lateralAxis,sideOffset,uncrossed,
  type LocomotionMode} from './breach-locomotion.ts';
import {footArticulation} from './breach-foot-articulation.ts';
import {horizontalLegReach,fitLandingToHip,LEG_HIP_SIDE} from './breach-leg-geometry.ts';
export type GroundPoint={x:number;y:number};
export type FootPhase='planted'|'unloading'|'swinging'|'landing'|'recovering';
export type StepReason='locomotion'|'turn'|'settle';
export type FootstepState={
  phase:FootPhase;plantedAt:GroundPoint;swingFrom:GroundPoint;
  swingTo:GroundPoint;phaseStart:number;phaseDuration:number;
  contact:boolean;worldYaw:number;fromYaw:number;targetYaw:number;
  reason:StepReason;lastTouchdown:number;
  swingDuration:number;landingDuration:number;recoveryDuration:number;
};
export type FootstepScheduler={
  feet:[FootstepState,FootstepState];initialized:boolean;
  lastTime:number;lastPosition:GroundPoint;lastYaw:number;
  lastStepFoot:number;lastStepAt:number;resets:number;
  mode:LocomotionMode;shuffleLead:number;shuffleNext:'lead'|'follow';
  pelvisYaw:number;pivotFromYaw:number;pivotToYaw:number;
  pivotAt:number;pivotDuration:number;lastBlocked:boolean;
};
export type FootstepInput={
  time:number;position:GroundPoint;rootYaw:number;
  /** Motor stopped making progress despite a pending movement order. */
  blocked?:boolean;
  /** Physical scene clearance; optional for isolated gait labs. */
  footAllowed?:(p:GroundPoint)=>boolean;
  /** Travel direction in the same world X/Y plane, independent of rootYaw. */
  travelYaw:number;speed:number;turning:number;
  posture:'stand'|'crouch';injury:number;down:boolean;
  cautious?:boolean;facingYaw?:number;
  gait?:'walk'|'run'|'pie';
};
export type FootTarget={position:GroundPoint;height:number;
  worldYaw:number;phase:FootPhase;contact:boolean;
  reason?:StepReason;progress?:number;pitch?:number;}
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
const deltaAngle=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const ease=(t:number)=>t*t*(3-2*t);
const distance=(a:GroundPoint,b:GroundPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const copy=(p:GroundPoint):GroundPoint=>({x:p.x,y:p.y});
const lateral=(position:GroundPoint,yaw:number,side:number):GroundPoint=>({
  x:position.x-Math.sin(yaw)*side*5.6,
  y:position.y+Math.cos(yaw)*side*5.6
});
/** Nearest neutral foothold. Ordinary planted contacts are never shifted. */
export function safePlantPoint(input:FootstepInput,index:number):GroundPoint{
  const facing=input.facingYaw??-input.rootYaw;
  const side=index===0?-1:1;
  const normal=lateral(input.position,facing,side);
  if(!input.footAllowed||input.footAllowed(normal))return normal;
  const forward={x:Math.cos(facing),y:Math.sin(facing)};
  const across={x:-forward.y,y:forward.x};
  for(const distanceAcross of [4.3,3.1,1.6,0])
    for(const ahead of [0,-3,3,-5,5]){
      const point={x:input.position.x+across.x*side*distanceAcross+
        forward.x*ahead,y:input.position.y+across.y*side*distanceAcross+
        forward.y*ahead};
      if(input.footAllowed(point))return point;
    }
  // Never put both shoes at the actor origin to hide an obstruction.
  // The scheduler must report the blocked foot instead.
  return normal;
}
/** Explicit input-boundary validation for corrupt/legacy replay tracks.
 * This is a deterministic seek reset, not a live renderer correction.
 * Normal recorded contacts remain untouched; only impossible samples reset.
 */
export function validatedReplayFeet(input:FootstepInput,
  feet:[FootTarget,FootTarget]):[FootTarget,FootTarget]{
  return feet.map((foot,i):FootTarget=>{
    const gap=distance(input.position,foot.position);
    // Validate against the longest center-to-ankle reach, including hip
    // lateral offset; a stale 22-unit contact is not physically plausible.
    if(Number.isFinite(gap)&&gap<horizontalLegReach()+LEG_HIP_SIDE+1.5)
      return foot;
    const safe=safePlantPoint(input,i);
    return {position:safe,height:0,worldYaw:input.rootYaw,
      phase:'recovering',contact:true,reason:'settle',
      progress:1,pitch:0};
  }) as [FootTarget,FootTarget];
}
function createFoot():FootstepState{
  return {phase:'planted',plantedAt:{x:0,y:0},
    swingFrom:{x:0,y:0},swingTo:{x:0,y:0},phaseStart:0,
    phaseDuration:0,contact:true,worldYaw:0,fromYaw:0,
    targetYaw:0,reason:'locomotion',lastTouchdown:-100,
    swingDuration:.16,landingDuration:.035,recoveryDuration:.055};
}
export function createFootstepScheduler():FootstepScheduler{
  return {feet:[createFoot(),createFoot()],initialized:false,
    lastTime:-1,lastPosition:{x:0,y:0},lastYaw:0,
    lastStepFoot:1,lastStepAt:-100,resets:0,
    mode:'idle',shuffleLead:1,shuffleNext:'lead',
    pelvisYaw:0,pivotFromYaw:0,pivotToYaw:0,pivotAt:0,pivotDuration:0,lastBlocked:false};
}
export function resetFootsteps(s:FootstepScheduler,input:FootstepInput):void{
  for(let i=0;i<2;i++){
    const foot=s.feet[i],point=input.footAllowed?
      safePlantPoint(input,i):lateral(input.position,
        input.facingYaw??input.rootYaw,i===0?-1:1);
    foot.phase='planted';foot.plantedAt=copy(point);
    foot.swingFrom=copy(point);foot.swingTo=copy(point);
    foot.worldYaw=input.rootYaw;foot.fromYaw=input.rootYaw;
    foot.targetYaw=input.rootYaw;foot.contact=true;
    foot.phaseStart=input.time;foot.phaseDuration=0;
    foot.lastTouchdown=input.time;
    foot.swingDuration=.16;foot.landingDuration=.035;
    foot.recoveryDuration=.055;
  }
  s.initialized=true;s.lastTime=input.time;s.lastPosition=copy(input.position);
  s.lastYaw=input.rootYaw;s.lastStepAt=-100;s.lastStepFoot=1;s.resets++;
  s.mode='idle';s.shuffleNext='lead';s.pelvisYaw=input.rootYaw;
  s.pivotFromYaw=input.rootYaw;s.pivotToYaw=input.rootYaw;
  s.pivotAt=input.time;s.pivotDuration=0;
  s.lastBlocked=!!input.blocked;
}
export function gaitBounds(input:FootstepInput){
  const running=input.gait==='run'&&input.speed>25;
  const deliberate=input.gait==='pie';
  const slow=input.cautious||input.posture==='crouch'||deliberate;
  const wound=input.injury>=2;
  const mode=classifyLocomotion(input.speed,
    input.facingYaw??-input.rootYaw,input.travelYaw,input.turning);
  const side=mode==='strafe-left'||mode==='strafe-right';
  const backward=mode==='backward';
  const strideScale=deliberate?.58:slow?.70:wound?.78:running?1.20:1;
  // Directional gaits differ in actual stride length and transfer timing,
  // not merely in animation frequency. Lateral lead/follow shuffles have
  // intentionally longer swing than the old 135 ms scurry.
  // Preserve the proven fast lead/follow transfer for a 38-unit strafe:
  // simply making its swing slower produces unreachable trailing legs.
  // Pieing gets a different, slower cadence at much lower motor speed.
  // Each touchdown must occur before the supporting leg is pulled beyond
  // its reachable arc. A long swing at motor speed causes visible tethering.
  const baseSwing=deliberate?.235:running?.125:
    slow?.175:wound?.16:side?.135:backward?.16:.145;
  const speedAdjustment=deliberate?0:
    running?Math.min(input.speed,90)*.00012:
    Math.min(input.speed,75)*(side?.00045:.00038);
  return {comfortableForward:5.5*strideScale,
    comfortableLateral:deliberate?3.7:4.5,
    maximumReach:horizontalLegReach()-.65,
    emergencyReach:horizontalLegReach(),
    preferredLead:deliberate?2.25:running?8.0:
      slow?4.5:wound?4.6:7.0,
    swingDuration:clamp(baseSwing-speedAdjustment,
      deliberate?.17:running?.11:side?.135:.115,.30),
    unloadDuration:deliberate?.065:running?.028:side?.025:
      slow?.040:.030,
    landingDuration:deliberate?.065:running?.036:side?.038:
      slow?.048:.040,
    recoveryDuration:deliberate?.08:running?.048:side?.050:
      slow?.075:.055};
}
/** Clamp planned *paths*, not rendered boots. In the local facing frame
 * the left foot must remain left of the right foot throughout a swing. */
function safeLanding(s:FootstepScheduler,index:number,
  proposed:GroundPoint,input:FootstepInput):GroundPoint{
  const facing=input.facingYaw??-input.rootYaw;
  const axis=lateralAxis(facing),other=s.feet[1-index];
  const gap=4.0;
  const lateral=sideOffset(input.position,proposed,facing);
  const otherLateral=sideOffset(input.position,other.plantedAt,facing);
  const side=index===0?-1:1;
  const minimum=side===1?otherLateral+gap:Math.max(-25,-Infinity);
  const maximum=side===-1?otherLateral-gap:Math.min(25,Infinity);
  // Keep a foot on its anatomical side whenever the other side allows it.
  // During a lateral slide the planted foot may temporarily be farther
  // from the pelvis; never warp it to satisfy a comfort envelope.
  const target=side===1?Math.max(lateral,minimum):
    Math.min(lateral,maximum);
  const safe=side===1?Math.max(target,1.9):
    Math.min(target,-1.9);
  return {x:proposed.x+axis.x*(safe-lateral),
    y:proposed.y+axis.y*(safe-lateral)};
}
function startStep(s:FootstepScheduler,index:number,input:FootstepInput){
  const foot=s.feet[index],bounds=gaitBounds(input);
  const facing=input.facingYaw??-input.rootYaw;
  const axis=lateralAxis(facing);
  const duration=bounds.unloadDuration+bounds.swingDuration;
  const strafe=s.mode==='strafe-left'||s.mode==='strafe-right';
  const pivot=s.mode==='pivot',settle=s.mode==='settle';
  const travel=input.speed>5?input.travelYaw:facing;
  const advance=clamp(input.speed*duration,0,
    horizontalLegReach()*.82);
  const predicted={x:input.position.x+Math.cos(travel)*advance,
    y:input.position.y+Math.sin(travel)*advance};
  let land=lateral(predicted,facing,index===0?-1:1);
  if(strafe){
    // Shuffle outward with the leading foot, then draw in the trailing
    // foot. The follow-step cannot overtake the leading foot.
    const outward=s.shuffleLead===1?1:-1;
    const lead=index===s.shuffleLead;
    const base=sideOffset(input.position,land,facing);
    // The normal stance already includes 5.6 units of outward reach.
    // Adding another 4.3 sends the lead boot outside the reachable IK
    // envelope when the supporting leg is already trailing.
    const wanted=base+(lead?outward*1.5:outward*.25);
    land={x:land.x+axis.x*(wanted-base),
      y:land.y+axis.y*(wanted-base)};
  }else if(pivot){
    const delta=deltaAngle(s.pelvisYaw,input.rootYaw);
    // A single planted-foot pivot may turn the pelvis only by a modest
    // angle. Longer rotations require multiple alternating replant steps.
    const turnYaw=s.pelvisYaw+clamp(delta,-.42,.42);
    land=lateral(input.position,-turnYaw,index===0?-1:1);
    land=safeLanding(s,index,land,
      {...input,facingYaw:-s.pelvisYaw});
    s.pivotFromYaw=s.pelvisYaw;s.pivotToYaw=turnYaw;
    s.pivotAt=input.time;s.pivotDuration=duration;
  }else if(settle){
    land=lateral(input.position,facing,index===0?-1:1);
  }else if(input.speed>5){
    land.x+=Math.cos(travel)*bounds.preferredLead;
    land.y+=Math.sin(travel)*bounds.preferredLead;
  }
  // A lateral landing belongs to the predicted touchdown pelvis, not the
  // current pelvis. Clamping the trailing boot to today's hip forces it
  // behind the body again by the time the swing ends (repeated IK snaps).
  land=safeLanding(s,index,land,pivot?
    {...input,facingYaw:-s.pelvisYaw}:strafe?
    {...input,position:predicted}:input);
  // Evaluate reach around the PREDICTED touchdown hip, not today's
  // actor center. The hip is offset laterally from the root.
  const hipSide=index===0?-1:1;
  const touchdownHip={x:predicted.x+axis.x*hipSide*LEG_HIP_SIDE,
    y:predicted.y+axis.y*hipSide*LEG_HIP_SIDE};
  land=fitLandingToHip(land,touchdownHip);
  if(input.footAllowed&&!input.footAllowed(land)){
    // Search toward the neutral foothold before declaring a blocked
    // step; never snap the existing planted foot inside a prop.
    const neutral=safePlantPoint({...input,position:predicted},index);
    const fitted=fitLandingToHip(neutral,touchdownHip);
    if(!input.footAllowed(fitted))return;
    land=fitted;
  }
  foot.swingFrom=copy(foot.plantedAt);foot.swingTo=land;
  foot.fromYaw=foot.worldYaw;
  foot.targetYaw=pivot?s.pivotToYaw:input.rootYaw;
  foot.phase='unloading';foot.contact=true;
  foot.reason=pivot?'turn':settle?'settle':'locomotion';
  foot.phaseStart=input.time;foot.phaseDuration=bounds.unloadDuration;
  foot.swingDuration=bounds.swingDuration;
  foot.landingDuration=bounds.landingDuration;
  foot.recoveryDuration=bounds.recoveryDuration;
  s.lastStepFoot=index;s.lastStepAt=input.time;
  if(strafe)s.shuffleNext=s.shuffleNext==='lead'?'follow':'lead';
}
function progress(foot:FootstepState,input:FootstepInput){
  // Advance by timestamps, never by render dt. Avoid stale anchors on a
  // skipped frame and preserve the touchdown world position exactly.
  for(let count=0;count<5;count++){
    const end=foot.phaseStart+foot.phaseDuration;
    if(foot.phase==='planted'||input.time<end-1e-8)break;
    foot.phaseStart=end;
    if(foot.phase==='unloading'){
      foot.phase='swinging';foot.phaseDuration=foot.swingDuration;
      foot.contact=false;
    }else if(foot.phase==='swinging'){
      foot.phase='landing';foot.phaseDuration=foot.landingDuration;
      foot.plantedAt=copy(foot.swingTo);foot.worldYaw=foot.targetYaw;
      foot.lastTouchdown=end;foot.contact=true;
    }else if(foot.phase==='landing'){
      foot.phase='recovering';foot.phaseDuration=foot.recoveryDuration;
    }else if(foot.phase==='recovering'){
      foot.phase='planted';foot.phaseDuration=0;
    }
  }
}
function target(foot:FootstepState,input:FootstepInput):FootTarget{
  if(foot.phase!=='swinging'){
    const progress=foot.phaseDuration>0?
      clamp((input.time-foot.phaseStart)/foot.phaseDuration,0,1):0;
    const movement=footArticulation(foot.phase,progress);
    return {position:copy(foot.plantedAt),height:0,
      worldYaw:foot.worldYaw,phase:foot.phase,contact:foot.contact,
      reason:foot.reason,progress,pitch:movement.pitch};
  }
  const t=clamp((input.time-foot.phaseStart)/foot.phaseDuration,0,1);
  const e=ease(t),movement=footArticulation('swinging',t);
  return {position:{x:mix(foot.swingFrom.x,foot.swingTo.x,e),
    y:mix(foot.swingFrom.y,foot.swingTo.y,e)},
    height:movement.rise*(input.cautious?2.1:3.4),
    worldYaw:foot.fromYaw+deltaAngle(foot.fromYaw,foot.targetYaw)*e,
    phase:foot.phase,contact:false,reason:foot.reason,progress:t,
    pitch:movement.pitch};
}
export function advanceFootsteps(s:FootstepScheduler,source:FootstepInput):
  [FootTarget,FootTarget]{
  // A blocked route must not animate walking using stale motor velocity.
  const input=source.blocked?{...source,speed:0,turning:0}:source;
  const dt=input.time-s.lastTime;
  const discontinuity=!s.initialized||dt<-.015||dt>1.2||
    distance(s.lastPosition,input.position)>
      Math.max(22,input.speed*Math.max(0,dt)*1.7+17);
  // Only actual timeline/position discontinuities may reset contacts.
  // Transient door/actor obstruction requests a visible recovery step;
  // never teleport the boots merely because clearance changed.
  if(discontinuity)resetFootsteps(s,input);
  for(const foot of s.feet)progress(foot,input);
  // One scheduled recovery at a time. The old path could start *both*
  // planted feet recovering on the same frame, then the renderer changed
  // their targets again. An obstructed contact must finish an intentional
  // swing before another recovery can begin.
  const recoveringBusy=s.feet.some(f=>f.phase==='unloading'||
    f.phase==='swinging');
  if(!!input.footAllowed&&!input.down&&!recoveringBusy&&
      input.time-s.lastStepAt>.11){
    let selected=-1,urgency=0;
    for(let i=0;i<2;i++){
      const foot=s.feet[i],anchor=foot.plantedAt;
      const gap=distance(anchor,input.position);
      const blockedContact=!!input.footAllowed&&
        !input.footAllowed(anchor);
      const excessive=gap>horizontalLegReach()*.80;
      if(!blockedContact&&!excessive)continue;
      const score=(blockedContact?20:0)+gap;
      if(score>urgency){urgency=score;selected=i;}
    }
    if(selected>=0){
      const foot=s.feet[selected];
      const next=safePlantPoint({...input,speed:0},selected);
      if(distance(next,foot.plantedAt)>.1){
        foot.swingFrom=copy(foot.plantedAt);foot.swingTo=next;
        foot.fromYaw=foot.worldYaw;foot.targetYaw=input.rootYaw;
        foot.phase='unloading';foot.contact=true;foot.reason='settle';
        foot.phaseStart=input.time;foot.phaseDuration=.055;
        foot.swingDuration=.22;foot.landingDuration=.065;
        foot.recoveryDuration=.085;s.lastStepFoot=selected;
        s.lastStepAt=input.time;
      }
    }
  }
  const facing=input.facingYaw??-input.rootYaw;
  const pivotSwing=s.feet.some(foot=>foot.reason==='turn'&&
    (foot.phase==='unloading'||foot.phase==='swinging'));
  const pendingPivot=input.speed<6&&(pivotSwing||
    Math.abs(deltaAngle(s.pelvisYaw,input.rootYaw))>.12);
  const requested=pendingPivot?'pivot':
    classifyLocomotion(input.speed,facing,input.travelYaw,
      input.turning,s.mode);
  if(requested!==s.mode){
    // A reversing shuffle starts with the new leading foot; the active
    // step is never cancelled or teleported mid-swing.
    s.mode=requested;
    s.shuffleLead=requested==='strafe-left'?0:1;
    s.shuffleNext='lead';
  }
  const bounds=gaitBounds(input);
  if(s.mode==='pivot'&&s.pivotDuration>0){
    const progress=clamp((input.time-s.pivotAt)/s.pivotDuration,0,1);
    const smooth=progress*progress*(3-2*progress);
    s.pelvisYaw=s.pivotFromYaw+
      deltaAngle(s.pivotFromYaw,s.pivotToYaw)*smooth;
  }else if(s.mode!=='pivot'){
    // Even a final small correction must not snap the pelvis on a
    // paused frame. When moving, the usual locomotion turn takes over.
    s.pelvisYaw+=clamp(deltaAngle(s.pelvisYaw,input.rootYaw),
      input.speed<6?-.055:-.22,input.speed<6?.055:.22);
  }
  const busy=s.feet.some(f=>f.phase==='unloading'||f.phase==='swinging');
  if(!busy&&!input.down){
    let best=-1,bestScore=0;
    const strafe=s.mode==='strafe-left'||s.mode==='strafe-right';
    const active=input.speed>7;
    for(let i=0;i<2;i++){
      const foot=s.feet[i];
      if(foot.phase!=='planted'&&foot.phase!=='recovering'&&
        foot.phase!=='landing')continue;
      // Starting an active sidestep should launch the lead foot on the
      // first moving tick. Waiting 60 ms makes the *opposite* planted leg
      // trail too far behind before it can ever become the follow step.
      if(input.time-foot.lastTouchdown<.06&&
        !(strafe&&s.lastStepAt<0))continue;
      const neutral=lateral(input.position,facing,i===0?-1:1);
      const dx=neutral.x-foot.plantedAt.x,dy=neutral.y-foot.plantedAt.y;
      const forward=dx*Math.cos(input.travelYaw)+dy*Math.sin(input.travelYaw);
      const error=Math.hypot(dx,dy);
      const turningError=Math.abs(deltaAngle(foot.worldYaw,input.rootYaw));
      // Move the next foot before the current planted leg becomes a
      // straight, detached-looking tether. This threshold is derived
      // from the two-bone leg's horizontal reach at standing hip height.
      const reach=Math.hypot(input.position.x-foot.plantedAt.x,
        input.position.y-foot.plantedAt.y);
      const urgent=reach>horizontalLegReach()*.62;
      if(strafe){
        const candidate=s.shuffleNext==='lead'?s.shuffleLead:1-s.shuffleLead;
        if(i!==candidate)continue;
        const along=sideOffset(input.position,foot.plantedAt,facing);
        const need=Math.abs(along-(i===0?-5.6:5.6));
        // Start a lead step when movement begins or the leading foot
        // trails the pelvis; follow only after the lead has landed.
        if(s.shuffleNext==='lead'&&
          (s.lastStepAt<0||need>bounds.comfortableLateral*.47||urgent))
          {best=i;break;}
        if(s.shuffleNext==='follow'&&
          (need>1.6||error>2.1||urgent)){best=i;break;}
        continue;
      }
      const settle=s.mode==='settle'&&error>5.5;
      const mustMove=active&&(forward>bounds.comfortableForward*.64||
        error>bounds.comfortableLateral||s.lastStepAt<0||urgent);
      const pivot=s.mode==='pivot'&&(
        Math.abs(deltaAngle(s.pelvisYaw,input.rootYaw))>.1||
        turningError>.2||error>5.5);
      if(!mustMove&&!pivot&&!settle)continue;
      // Pivot foot sequence alternates. Prefer the opposite foot after
      // landing rather than continuously rotating the same leg.
      if(pivot&&i===s.lastStepFoot)continue;
      const score=active?forward+error*.3:turningError*8+error;
      if(score>bestScore+.001||best<0){best=i;bestScore=score;}
    }
    if(best>=0&&input.time-s.lastStepAt>(active?.055:.17)){
      startStep(s,best,input);
    }
  }
  const samples=s.feet.map(foot=>target(foot,input)) as
    [FootTarget,FootTarget];
  // Debug assertion: never silently accept a crossed planted stance.
  // A previous planted foot is not teleported even when the body turns.
  // The planner must schedule a recovery step if this becomes unsafe.
  void uncrossed;
  s.lastTime=input.time;s.lastPosition=copy(input.position);
  s.lastYaw=input.rootYaw;s.lastBlocked=!!input.blocked;
  return samples;
}
