/** Build 119: deliberate world-space steps. No render-frame stance clamping.
 * The game motor supplies position and velocity; this module never moves actors.
 */
export type GroundPoint={x:number;y:number};
export type FootPhase='planted'|'unloading'|'swinging'|'landing'|'recovering';
export type StepReason='locomotion'|'turn'|'settle';
export type FootstepState={
  phase:FootPhase;plantedAt:GroundPoint;swingFrom:GroundPoint;
  swingTo:GroundPoint;phaseStart:number;phaseDuration:number;
  contact:boolean;worldYaw:number;fromYaw:number;targetYaw:number;
  reason:StepReason;lastTouchdown:number;
};
export type FootstepScheduler={
  feet:[FootstepState,FootstepState];initialized:boolean;
  lastTime:number;lastPosition:GroundPoint;lastYaw:number;
  lastStepFoot:number;lastStepAt:number;resets:number;
};
export type FootstepInput={
  time:number;position:GroundPoint;rootYaw:number;
  /** Travel direction in the same world X/Y plane, independent of rootYaw. */
  travelYaw:number;speed:number;turning:number;
  posture:'stand'|'crouch';injury:number;down:boolean;
  cautious?:boolean;
};
export type FootTarget={position:GroundPoint;height:number;
  worldYaw:number;phase:FootPhase;contact:boolean};
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
function createFoot():FootstepState{
  return {phase:'planted',plantedAt:{x:0,y:0},
    swingFrom:{x:0,y:0},swingTo:{x:0,y:0},phaseStart:0,
    phaseDuration:0,contact:true,worldYaw:0,fromYaw:0,
    targetYaw:0,reason:'locomotion',lastTouchdown:-100};
}
export function createFootstepScheduler():FootstepScheduler{
  return {feet:[createFoot(),createFoot()],initialized:false,
    lastTime:-1,lastPosition:{x:0,y:0},lastYaw:0,
    lastStepFoot:1,lastStepAt:-100,resets:0};
}
export function resetFootsteps(s:FootstepScheduler,input:FootstepInput):void{
  for(let i=0;i<2;i++){
    const foot=s.feet[i],point=lateral(input.position,input.rootYaw,i===0?-1:1);
    foot.phase='planted';foot.plantedAt=copy(point);
    foot.swingFrom=copy(point);foot.swingTo=copy(point);
    foot.worldYaw=input.rootYaw;foot.fromYaw=input.rootYaw;
    foot.targetYaw=input.rootYaw;foot.contact=true;
    foot.phaseStart=input.time;foot.phaseDuration=0;
    foot.lastTouchdown=input.time;
  }
  s.initialized=true;s.lastTime=input.time;s.lastPosition=copy(input.position);
  s.lastYaw=input.rootYaw;s.lastStepAt=-100;s.lastStepFoot=1;s.resets++;
}
export function gaitBounds(input:FootstepInput){
  const slow=input.cautious||input.posture==='crouch';
  const wound=input.injury>=2;
  const strideScale=slow?.70:wound?.78:1;
  return {comfortableForward:5.5*strideScale,
    comfortableLateral:4.5,maximumReach:9.0,
    emergencyReach:11.0,preferredLead:(slow?3.0:wound?3.7:5.5),
    swingDuration:clamp((slow?.23:wound?.22:.16)-
      Math.min(input.speed,75)*.00055,.12,.28),
    unloadDuration:slow?.055:.025,
    landingDuration:.035,recoveryDuration:slow?.09:.055};
}
function startStep(s:FootstepScheduler,index:number,input:FootstepInput){
  const foot=s.feet[index],bounds=gaitBounds(input);
  const duration=bounds.unloadDuration+bounds.swingDuration;
  const travel=input.speed>5?input.travelYaw:input.rootYaw;
  const advance=clamp(input.speed*duration,0,13);
  const predicted={x:input.position.x+Math.cos(travel)*advance,
    y:input.position.y+Math.sin(travel)*advance};
  const land=lateral(predicted,input.rootYaw,index===0?-1:1);
  if(input.speed>5){
    land.x+=Math.cos(travel)*bounds.preferredLead;
    land.y+=Math.sin(travel)*bounds.preferredLead;
  }
  // Turn in place: a pivot step relocates a foot without sliding its anchor.
  foot.swingFrom=copy(foot.plantedAt);foot.swingTo=land;
  foot.fromYaw=foot.worldYaw;foot.targetYaw=input.rootYaw;
  foot.phase='unloading';foot.contact=true;
  foot.reason=input.speed>5?'locomotion':'turn';
  foot.phaseStart=input.time;foot.phaseDuration=bounds.unloadDuration;
  s.lastStepFoot=index;s.lastStepAt=input.time;
}
function progress(foot:FootstepState,input:FootstepInput){
  const bounds=gaitBounds(input);
  // Advance by timestamps, never by render dt. Avoid stale anchors on a
  // skipped frame and preserve the touchdown world position exactly.
  for(let count=0;count<5;count++){
    const end=foot.phaseStart+foot.phaseDuration;
    if(foot.phase==='planted'||input.time<end-1e-8)break;
    foot.phaseStart=end;
    if(foot.phase==='unloading'){
      foot.phase='swinging';foot.phaseDuration=bounds.swingDuration;
      foot.contact=false;
    }else if(foot.phase==='swinging'){
      foot.phase='landing';foot.phaseDuration=bounds.landingDuration;
      foot.plantedAt=copy(foot.swingTo);foot.worldYaw=foot.targetYaw;
      foot.lastTouchdown=end;foot.contact=true;
    }else if(foot.phase==='landing'){
      foot.phase='recovering';foot.phaseDuration=bounds.recoveryDuration;
    }else if(foot.phase==='recovering'){
      foot.phase='planted';foot.phaseDuration=0;
    }
  }
}
function target(foot:FootstepState,input:FootstepInput):FootTarget{
  if(foot.phase!=='swinging'){
    return {position:copy(foot.plantedAt),height:0,
      worldYaw:foot.worldYaw,phase:foot.phase,contact:foot.contact};
  }
  const t=clamp((input.time-foot.phaseStart)/foot.phaseDuration,0,1);
  const e=ease(t);
  return {position:{x:mix(foot.swingFrom.x,foot.swingTo.x,e),
    y:mix(foot.swingFrom.y,foot.swingTo.y,e)},
    height:Math.sin(Math.PI*t)*(input.cautious?2.1:3.4),
    worldYaw:foot.fromYaw+deltaAngle(foot.fromYaw,foot.targetYaw)*e,
    phase:foot.phase,contact:false};
}
export function advanceFootsteps(s:FootstepScheduler,input:FootstepInput):
  [FootTarget,FootTarget]{
  const dt=input.time-s.lastTime;
  const discontinuity=!s.initialized||dt<-.015||dt>1.2||
    distance(s.lastPosition,input.position)>
      Math.max(22,input.speed*Math.max(0,dt)*1.7+17);
  if(discontinuity)resetFootsteps(s,input);
  for(const foot of s.feet)progress(foot,input);
  const bounds=gaitBounds(input);
  // No two legs may lose contact in ordinary walking. A planted anchor is
  // NEVER translated merely because the pelvis moves or turns.
  const busy=s.feet.some(f=>f.phase==='unloading'||f.phase==='swinging');
  if(!busy&&!input.down){
    let best=-1,bestScore=0;
    const active=input.speed>7;
    for(let i=0;i<2;i++){
      const foot=s.feet[i];
      if(foot.phase!=='planted'&&foot.phase!=='recovering'&&
        foot.phase!=='landing')continue;
      if(input.time-foot.lastTouchdown<.06)continue;
      const neutral=lateral(input.position,input.rootYaw,i===0?-1:1);
      const dx=neutral.x-foot.plantedAt.x,dy=neutral.y-foot.plantedAt.y;
      const forward=dx*Math.cos(input.travelYaw)+dy*Math.sin(input.travelYaw);
      const error=Math.hypot(dx,dy);
      const turningError=Math.abs(deltaAngle(foot.worldYaw,input.rootYaw));
      const mustMove=active&&(forward>bounds.comfortableForward*.64||
        error>bounds.comfortableLateral||
        s.lastStepAt<0);
      const pivot=!active&&(turningError>.31||error>5.5);
      if(!mustMove&&!pivot)continue;
      const score=active?forward+error*.3:turningError*8+error;
      if(score>bestScore+.001||best<0){
        best=i;bestScore=score;
      }
    }
    if(best>=0&&input.time-s.lastStepAt>(active?.09:.19)){
      startStep(s,best,input);
    }
  }
  const samples=s.feet.map(foot=>target(foot,input)) as
    [FootTarget,FootTarget];
  s.lastTime=input.time;s.lastPosition=copy(input.position);
  s.lastYaw=input.rootYaw;
  return samples;
}
