/** Build 122: deterministic authored test tracks, with real displacement.
 * No separate animation engine: the same Build 119 scheduler is sampled
 * at a fixed simulation rate and the Build 120 rig renders the results.
 */
import {advanceFootsteps,createFootstepScheduler,
  type FootstepInput,type FootstepScheduler,type FootTarget}
  from './breach-footsteps.ts';
export const LAB_TRACKS=[
  'idle','walk','accelerate','stop','restart','back',
  'strafe-left','strafe-right','strafe','strafe-stop',
  'strafe-reverse','mixed','turn-90','turn-180','turn','pivot-reverse',
  'pie','look','crouch-walk','crouch','wounded','aim',
  'high-ready','low-ready','ready','short-stock','active-aim',
  'point-shoot','reload',
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
function copy(s:FootstepScheduler):FootstepScheduler{
  return {...s,lastPosition:{...s.lastPosition},
    feet:s.feet.map(f=>({...f,plantedAt:{...f.plantedAt},
      swingFrom:{...f.swingFrom},swingTo:{...f.swingTo}})) as
        FootstepScheduler['feet']};
}
function gaitInput(time:number,m:LabMotion):FootstepInput{
  return {time,position:{x:m.x,y:m.z},
    rootYaw:-(m.speed>16&&
      Math.abs(Math.sin(m.travelYaw-m.heading))<=.52&&
      Math.cos(m.travelYaw-m.heading)>=-.4?m.travelYaw:m.heading),
    facingYaw:m.heading,
    travelYaw:m.travelYaw,speed:m.speed,turning:m.turning,
    posture:m.posture,injury:m.injury,down:m.down,
    cautious:m.aim>.2&&m.speed/72<.35};
}
export class LabMotionCache{
  readonly frames:FootstepScheduler[]=[];
  readonly kind:LabTrack;
  constructor(kind:LabTrack){
    this.kind=kind;
    const state=createFootstepScheduler();
    for(let frame=0;frame<=TRACK_DURATION*60;frame++){
      const t=frame/60;
      advanceFootsteps(state,gaitInput(t,sampleLabTrack(kind,t)));
      this.frames.push(copy(state));
    }
  }
  sample(time:number):{motion:LabMotion;
    feet:[FootTarget,FootTarget];state:FootstepScheduler}{
    const t=clamp(time,0,TRACK_DURATION);
    const motion=sampleLabTrack(this.kind,t);
    const index=Math.floor(t*60+1e-8);
    const state=copy(this.frames[Math.min(index,this.frames.length-1)]);
    const feet=advanceFootsteps(state,gaitInput(t,motion));
    return {motion,feet,state};
  }
}
