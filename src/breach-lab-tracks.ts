/** Build 122: deterministic authored test tracks, with real displacement.
 * No separate animation engine: the same Build 119 scheduler is sampled
 * at a fixed simulation rate and the Build 120 rig renders the results.
 */
import {advanceFootsteps,createFootstepScheduler,
  type FootstepInput,type FootstepScheduler,type FootTarget}
  from './breach-footsteps.ts';
export const LAB_TRACKS=[
  'idle','walk','run','accelerate','stop','restart','back',
  'strafe-left','strafe-right','strafe','strafe-stop',
  'strafe-reverse','mixed','turn-90','turn-180','turn','pivot-reverse',
  'pie','squeeze','look','crouch-walk','crouch','wounded','aim',
  'high-ready','low-ready','ready','short-stock','active-aim',
  'point-shoot','ready-to-ads','ads-to-low','reload',
  'reload-emergency','reload-retention','reload-shotgun',
  'reload-interrupt','reload-wounded',
  'flash','door','kick','bash','down','down-forward','down-back',
  'down-left','down-right','down-slump'
] as const;
export type LabTrack=typeof LAB_TRACKS[number];
export const TRACK_DURATION=4;
export type LabMotion={
  x:number;z:number;heading:number;travelYaw:number;speed:number;
  turning:number;posture:'stand'|'crouch';injury:number;
  aim:number;reload:number;throwAt:number;doorAt:number;down:boolean;
};
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const ease=(t:number)=>{const v=clamp(t,0,1);return v*v*(3-2*v);};
function position(kind:LabTrack,t:number){
  let x=0,z=0,heading=0;
  switch(kind){
    case 'walk':x=Math.min(t,3.65)*44;break;
    case 'run':x=Math.min(t,3.65)*78;break;
    case 'accelerate':
      if(t<1)x=20*t*t;
      else if(t<2.5)x=20+40*(t-1);
      else if(t<3.5){const u=t-2.5;x=80+40*u-20*u*u;}
      else x=100;
      break;
    case 'stop':x=48*Math.min(t,1.2);break;
    case 'restart':x=40*Math.min(t,.85)+
      35*clamp(t-1.55,0,1.5);break;
    case 'back':x=-30*Math.min(t,3.65);break;
    case 'strafe-left':z=-34*Math.min(t,3.65);break;
    case 'strafe-right':case 'strafe':
      z=34*Math.min(t,3.65);break;
    case 'strafe-stop':
      z=32*Math.min(t,1.25);break;
    case 'strafe-reverse':
      z=28*Math.min(t,1.25)-27*clamp(t-1.55,0,1.6);break;
    case 'mixed':
      x=40*Math.min(t,.85)-24*clamp(t-2.8,0,1);
      z=26*clamp(t-1,0,1.4);break;
    case 'turn-90':
      x=20*Math.min(t,.8);heading=Math.PI/2*ease((t-.8)/1.1);
      z=20*clamp(t-2.1,0,1.6);break;
    case 'turn-180':case 'turn':
      x=20*Math.min(t,.7)-22*clamp(t-2.4,0,1.4);
      heading=Math.PI*ease((t-.7)/1.6);break;
    case 'pivot-reverse':
      heading=Math.PI*.72*ease(t/1.35)-
        Math.PI*.90*ease((t-1.65)/1.55);break;
    case 'squeeze':z=15*Math.min(t,3.65);break;
    case 'pie':
      x=14*ease(t/3.6);z=-9*Math.sin(Math.PI*clamp(t/3.6,0,1));
      heading=-.3+1.0*ease(t/3.6);break;
    case 'look':x=34*Math.min(t,3.5);heading=.9;break;
    case 'crouch-walk':case 'crouch':
      x=19*Math.min(t,3.6);break;
    case 'wounded':x=23*Math.min(t,3.6);break;
  }
  return {x,z,heading};
}
export function sampleLabTrack(kind:LabTrack,time:number):LabMotion{
  const t=clamp(time,0,TRACK_DURATION);
  const p=position(kind,t);
  const past=position(kind,clamp(t-1/600,0,TRACK_DURATION));
  const next=position(kind,clamp(t+1/600,0,TRACK_DURATION));
  const interval=Math.max(1e-6,Math.min(TRACK_DURATION,t+1/600)-
    Math.max(0,t-1/600));
  const vx=(next.x-past.x)/interval;
  const vz=(next.z-past.z)/interval;
  const speed=Math.hypot(vx,vz);
  const travelYaw=speed>.01?Math.atan2(vz,vx):p.heading;
  const turning=Math.abs(next.heading-past.heading)/interval;
  const injury=kind==='wounded'?2:0;
  const posture=kind==='crouch'||kind==='crouch-walk'?
    'crouch' as const:'stand' as const;
  const aim=['aim','pie','look','strafe','strafe-left',
    'strafe-right','active-aim','point-shoot'].includes(kind)?1:0;
  const reload=kind.startsWith('reload')?
    kind==='reload-interrupt'?Math.max(0,t<.9?1.8-t:0):
    Math.max(0,1.8-(t%2.4)):0;
  const throwAt=kind==='flash'?Math.floor(t/1.5)*1.5:-100;
  const doorAt=kind==='kick'?.4:
    kind==='door'?Math.floor(t/1.3)*1.3:-100;
  return {...p,travelYaw,speed,turning,injury,posture,aim,
    reload,throwAt,doorAt,down:kind.startsWith('down')&&t>=.45};
}

/** Sample a recorded 60Hz timeline without advancing any gait scheduler.
 * Contacts change only on recorded ticks; airborne feet interpolate. */
export function interpolateGaitFeet(a:readonly [FootTarget,FootTarget],
 b:readonly [FootTarget,FootTarget],alpha:number):[FootTarget,FootTarget]{
 const w=clamp(alpha,0,1);
 return a.map((f,i):FootTarget=>{
   const next=b[i];
   if(f.phase!==next.phase||f.contact!==next.contact){
     return {...f,position:{...f.position}};
   }
   const lerp=(x:number,y:number)=>x+(y-x)*w;
   return {...f,position:{x:lerp(f.position.x,next.position.x),
     y:lerp(f.position.y,next.position.y)},
     height:lerp(f.height,next.height),
     pitch:lerp(f.pitch??0,next.pitch??0),
     progress:lerp(f.progress??0,next.progress??0),
     worldYaw:f.worldYaw+Math.atan2(
       Math.sin(next.worldYaw-f.worldYaw),
       Math.cos(next.worldYaw-f.worldYaw))*w};
 }) as [FootTarget,FootTarget];
}
export function recordedFeet(targets:readonly [FootTarget,FootTarget][],
 time:number):[FootTarget,FootTarget]{
 const tick=clamp(time,0,TRACK_DURATION)*60;
 const floor=Math.min(targets.length-1,Math.floor(tick+1e-8));
 return interpolateGaitFeet(targets[floor],
   targets[Math.min(floor+1,targets.length-1)],tick-floor);
}

function copy(s:FootstepScheduler):FootstepScheduler{
  return {...s,lastPosition:{...s.lastPosition},
    feet:s.feet.map(f=>({...f,plantedAt:{...f.plantedAt},
      swingFrom:{...f.swingFrom},swingTo:{...f.swingTo}})) as
        FootstepScheduler['feet']};
}
function gaitInput(time:number,m:LabMotion,kind?:LabTrack):FootstepInput{
  return {time,position:{x:m.x,y:m.z},
    rootYaw:-(m.speed>16&&
      Math.abs(Math.sin(m.travelYaw-m.heading))<=.52&&
      Math.cos(m.travelYaw-m.heading)>=-.4?m.travelYaw:m.heading),
    facingYaw:m.heading,
    travelYaw:m.travelYaw,speed:m.speed,turning:m.turning,
    posture:m.posture,injury:m.injury,down:m.down,
    cautious:m.aim>.2&&m.speed/72<.35,
    gait:kind==='squeeze'?'squeeze':kind==='pie'?'pie':
      m.speed>70?'run':
      m.speed<12&&Math.abs(m.turning)>.03?'pie':'walk'};
}
import {advanceFootsteps as historicalAdvance,
  createFootstepScheduler as historicalCreate,
  type FootstepScheduler as HistoricalFootstepScheduler}
  from './breach-historical-footsteps.ts';
function copyHistorical(s:HistoricalFootstepScheduler):HistoricalFootstepScheduler{
  return {...s,lastPosition:{...s.lastPosition},
    feet:s.feet.map(f=>({...f,plantedAt:{...f.plantedAt},
      swingFrom:{...f.swingFrom},swingTo:{...f.swingTo}})) as
      HistoricalFootstepScheduler['feet']};
}
export class LabHistoricalMotionCache{
  readonly frames:HistoricalFootstepScheduler[]=[];
  readonly targets:[FootTarget,FootTarget][]=[];
  readonly kind:LabTrack;
  constructor(kind:LabTrack){
    this.kind=kind;
    const gait=historicalCreate();
    for(let frame=0;frame<=TRACK_DURATION*60;frame++){
      const time=frame/60,m=sampleLabTrack(kind,time);
      const input=gaitInput(time,m,kind);
      const target=historicalAdvance(gait,{...input,gait:input.gait==='squeeze'?
        'walk':input.gait});
      this.targets.push(target.map(f=>({...f,
        position:{...f.position}})) as [FootTarget,FootTarget]);
      this.frames.push(copyHistorical(gait));
    }
  }
  sample(time:number){
    const t=clamp(time,0,TRACK_DURATION),motion=sampleLabTrack(this.kind,t);
    const frame=Math.floor(t*60+1e-8);
    const state=copyHistorical(this.frames[Math.min(frame,this.frames.length-1)]);
    const feet=recordedFeet(this.targets,t);
    return {motion,feet,state};
  }
}
import {createDistanceGait,advanceDistanceGait,cloneDistanceGait,
  type DistanceGaitState} from './breach-distance-gait.ts';
export class LabDistanceMotionCache{
  readonly frames:DistanceGaitState[]=[];
  readonly targets:[FootTarget,FootTarget][]=[];
  readonly kind:LabTrack;
  constructor(kind:LabTrack){
    this.kind=kind;
    const gait=createDistanceGait();
    for(let frame=0;frame<=TRACK_DURATION*60;frame++){
      const t=frame/60;
      const target=advanceDistanceGait(gait,gaitInput(t,sampleLabTrack(kind,t),kind));
      this.targets.push(target.map(f=>({...f,
        position:{...f.position}})) as [FootTarget,FootTarget]);
      this.frames.push(cloneDistanceGait(gait));
    }
  }
  sample(time:number){
    const t=clamp(time,0,TRACK_DURATION),motion=sampleLabTrack(this.kind,t);
    const index=Math.floor(t*60+1e-8);
    const state=cloneDistanceGait(this.frames[Math.min(index,this.frames.length-1)]);
    const feet=recordedFeet(this.targets,t);
    return {motion,feet,state};
  }
}
export class LabMotionCache{
  readonly frames:FootstepScheduler[]=[];
  readonly targets:[FootTarget,FootTarget][]=[];
  readonly kind:LabTrack;
  constructor(kind:LabTrack){
    this.kind=kind;
    const state=createFootstepScheduler();
    for(let frame=0;frame<=TRACK_DURATION*60;frame++){
      const t=frame/60;
      const target=advanceFootsteps(state,gaitInput(t,sampleLabTrack(kind,t),kind));
      this.targets.push(target.map(f=>({...f,
        position:{...f.position}})) as [FootTarget,FootTarget]);
      this.frames.push(copy(state));
    }
  }
  sample(time:number):{motion:LabMotion;
    feet:[FootTarget,FootTarget];state:FootstepScheduler}{
    const t=clamp(time,0,TRACK_DURATION);
    const motion=sampleLabTrack(this.kind,t);
    const index=Math.floor(t*60+1e-8);
    const state=copy(this.frames[Math.min(index,this.frames.length-1)]);
    const feet=recordedFeet(this.targets,t);
    return {motion,feet,state};
  }
}
