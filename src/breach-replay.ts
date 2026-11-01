/** Build 090–091: deterministic mission film, independent of the live motor.
 * We capture authoritative simulation outcomes at 20 Hz and never re-simulate
 * past actions. Rewind, scrubbing and speed changes cannot alter an outcome.
 */
import type {Session,TeamActor,ShotEvent,DroppedMagazine,FlashGrenade,FlashBurst,ImpactMark} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
import {intelSnapshot,intelRestore} from './breach-intel.ts';
import type {BattleEvent} from './breach-combat.ts';
import {ReplayMotionRecorder,type ReplayPresentation} from './breach-replay-motion.ts';

export type ActorFrame=Pick<TeamActor,
  'id'|'p'|'heading'|'health'|'velocity'|'turning'|'posture'|'pace'|'alert'|
  'magazine'|'reserve'|'reload'|'shots'|'fireCd'|'aim'|
  'insertedMagazineId'|'spareMagazines'|'reloadMode'|'reloadStartedAt'|
  'reloadDuration'|'reloadRemoved'|'reloadInserted'|
  'reloadFromRounds'|'reloadTargetRounds'|
  'lastHitAt'|'lastDownAt'|'lastHitRegion'|'lastHitYaw'|
  'lastHitSeverity'|'downPose'|'flashUntil'|'suppression'|
  'weapon'|'injuryStage'|'morale'|'surrendered'|'defense'|'watch'|
  'lastThrowAt'|'lastDoorAt'|'lastDoorId'|'lastDoorMethod'|'stride'|
  'weaponYaw'|'stability'|'recoil'|'lastShotAt'|'fireMode'|'burstCount'|'skills'|
  'squeeze'|'squeezeYaw'|'squeezeTime'>;
export type ReplayActorFrame=ActorFrame & {
 travelYaw?:number;intentKind?:string;awarenessCount?:number;
};
export type ReplayFrame={
  /** Presentation data is sampled on demand, never written to snapshots. */
  presentation?:ReplayPresentation;
  t:number;phase:Session['phase'];mission:Session['mission'];
  actors:ReplayActorFrame[];doors:Door[];shots:ShotEvent[];
  casings:Session['casings'];
  dropped:DroppedMagazine[];impactMarks:ImpactMark[];grenades:FlashGrenade[];
  flashBursts:FlashBurst[];flashRemaining:number;
  missionType:Session['missionType'];holdTime:number;
  rescue:{p:Pt;following:string|null}|null;objective:Pt;
  seenGround:string[];intel:ReturnType<typeof intelSnapshot>;
  known:[string,{p:Pt;at:number;status:'seen'|'heard'}][];
};
const position=(p:Pt):Pt=>({x:p.x,y:p.y});
const shotCopy=(shot:ShotEvent):ShotEvent=>({...shot,
  start:position(shot.start),end:position(shot.end)});
export function snapshot(s:Session,seenGround?:string[]):ReplayFrame{
  return {
    t:s.seconds,phase:s.phase,mission:s.mission,
    actors:s.operators.map(a=>({id:a.id,p:position(a.p),
      heading:a.heading,health:a.health,velocity:a.velocity,
      squeeze:a.squeeze,squeezeYaw:a.squeezeYaw,squeezeTime:a.squeezeTime,
      turning:a.turning,posture:a.posture,pace:a.pace,alert:a.alert,
      magazine:a.magazine,reserve:a.reserve,reload:a.reload,
      insertedMagazineId:a.insertedMagazineId,
      spareMagazines:a.spareMagazines.map(m=>({...m})),
      reloadMode:a.reloadMode,reloadStartedAt:a.reloadStartedAt,
      reloadDuration:a.reloadDuration,
      reloadRemoved:a.reloadRemoved,reloadInserted:a.reloadInserted,
      reloadFromRounds:a.reloadFromRounds,
      reloadTargetRounds:a.reloadTargetRounds,
      shots:a.shots,fireCd:a.fireCd,aim:a.aim,
      lastHitAt:a.lastHitAt,lastDownAt:a.lastDownAt,
      lastHitRegion:a.lastHitRegion,lastHitYaw:a.lastHitYaw,
      lastHitSeverity:a.lastHitSeverity,downPose:a.downPose,
      flashUntil:a.flashUntil,suppression:a.suppression,
      weapon:a.weapon,injuryStage:a.injuryStage,morale:a.morale,
      lastThrowAt:a.lastThrowAt,lastDoorAt:a.lastDoorAt,
      lastDoorId:a.lastDoorId,lastDoorMethod:a.lastDoorMethod,
      stride:a.stride,
      weaponYaw:a.weaponYaw,stability:a.stability,recoil:a.recoil,
      lastShotAt:a.lastShotAt,fireMode:a.fireMode,burstCount:a.burstCount,
      skills:{...a.skills},
      surrendered:a.surrendered,defense:a.defense?position(a.defense):null,
      watch:a.watch?position(a.watch):null,
      intentKind:a.intent?.kind,awarenessCount:Object.keys(a.awareness.contacts).length})),
    doors:s.doors.map(d=>({...d,a:position(d.a),b:position(d.b)})),
    shots:s.shots.map(shotCopy),
    casings:s.casings.map(x=>({...x})),
    dropped:s.dropped.map(m=>({...m,p:position(m.p)})),
    impactMarks:s.impactMarks.map(m=>({...m,p:position(m.p)})),
    grenades:s.grenades.map(g=>({...g,p:position(g.p),
      from:position(g.from),to:position(g.to)})),
    flashBursts:s.flashBursts.map(b=>({...b,p:position(b.p)})),
    flashRemaining:s.flashRemaining,
    missionType:s.missionType,holdTime:s.holdTime,
    rescue:s.rescue?{p:position(s.rescue.p),following:s.rescue.following}:null,
    objective:position(s.scenario.objective),
    seenGround:seenGround??[...s.seenGround],intel:intelSnapshot(s.intel),
    known:[...s.known].map(([id,c])=>[id,
      {p:position(c.p),at:c.at,status:c.status}]),
  };
}
export class MissionRecorder{
  readonly frames:ReplayFrame[]=[];
  readonly events:BattleEvent[]=[];
  private lastEventId=0;
  readonly motion=new ReplayMotionRecorder();
  capture(s:Session,force=false):void{
    if(this.frames.length>=12000)return;
    // This runs at 60Hz even though the outcome film is only 20Hz.
    // Recording step starts here avoids tying animation to render FPS.
    this.motion.record(s.seconds,s.operators,s.doors);
    for(const e of s.battleEvents)if(e.id>this.lastEventId){
      this.events.push({...e,p:e.p?position(e.p):undefined});
      this.lastEventId=e.id;
    }
    const last=this.frames.at(-1);
    if(!force&&last&&s.seconds-last.t<.049)return;
    if(last&&Math.abs(last.t-s.seconds)<1e-6){
      if(force)this.frames[this.frames.length-1]=snapshot(s);
      return;
    }
    // Bound mobile memory to ten minutes of sampled playback.
    if(this.frames.length>=12000)return;
    const remembered=last&&last.seenGround.length===s.seenGround.size?
      last.seenGround:undefined;
    const frame=snapshot(s,remembered);
    for(const actor of frame.actors)
      actor.travelYaw=this.motion.direction(actor.id);
    // Explored ground only grows. Reuse identical history instead of
    // allocating thousands of duplicate tile arrays during long missions.
    if(last&&last.seenGround.length===frame.seenGround.length)
      frame.seenGround=last.seenGround;
    this.frames.push(frame);
  }
  get duration(){return this.frames.at(-1)?.t??0;}
  surrounding(time:number):{previous:ReplayFrame;next:ReplayFrame;alpha:number}|null{
    if(!this.frames.length)return null;
    const t=Math.max(0,Math.min(time,this.duration));
    let lo=0,hi=this.frames.length-1;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      if(this.frames[mid].t<=t)lo=mid;
      else hi=mid-1;
    }
    const previous=this.frames[lo];
    const next=this.frames[Math.min(lo+1,this.frames.length-1)];
    const alpha=next.t>previous.t?
      Math.max(0,Math.min(1,(t-previous.t)/(next.t-previous.t))):0;
    return {previous,next,alpha};
  }
  at(time:number):ReplayFrame|null{return this.surrounding(time)?.previous??null;}
  /** A render-only snapshot. Outcomes/discrete changes remain on the left
   * authoritative sample. No mutation of stored frames or motor state. */
  sample(time:number):ReplayFrame|null{
    const span=this.surrounding(time);
    if(!span)return null;
    const {previous,next,alpha}=span;
    const t=previous.t+(next.t-previous.t)*alpha;
    const byId=new Map(next.actors.map(a=>[a.id,a]));
    const actors=previous.actors.map(a=>{
      const b=byId.get(a.id);
      if(!b||!alpha)return {...a,p:position(a.p)};
      return {...a,p:{x:mix(a.p.x,b.p.x,alpha),
        y:mix(a.p.y,b.p.y,alpha)},
        heading:mixAngle(a.heading,b.heading,alpha),
        weaponYaw:mixAngle(a.weaponYaw,b.weaponYaw,alpha),
        travelYaw:mixAngle(a.travelYaw??a.heading,
          b.travelYaw??b.heading,alpha),
        velocity:mix(a.velocity,b.velocity,alpha),
        turning:mix(a.turning,b.turning,alpha),
        aim:mix(a.aim,b.aim,alpha),
        reload:mix(a.reload,b.reload,alpha),
        recoil:mix(a.recoil,b.recoil,alpha),
        stability:mix(a.stability,b.stability,alpha),
        stride:mix(a.stride,b.stride,alpha)};
    });
    const presentation=this.motion.presentation(t,actors.map(a=>a.id));
    for(const actor of actors)
      presentation.travelYaw[actor.id]=actor.travelYaw??actor.heading;
    const delta=t-previous.t;
    const nextDoors=new Map(next.doors.map(d=>[d.id,d]));
    const doors=previous.doors.map(d=>{
      const later=nextDoors.get(d.id);
      return {...d,openFraction:later?mix(
        d.openFraction??(d.open?1:0),
        later.openFraction??(later.open?1:0),alpha):d.openFraction};
    });
    return {...previous,t,actors,doors,presentation,
      shots:previous.shots.map(s=>({...shotCopy(s),age:s.age+delta})),
      grenades:previous.grenades.map(g=>({...g,p:position(g.p),
        from:position(g.from),to:position(g.to)}))};
  }
}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const mixAngle=(a:number,b:number,t:number)=>
  a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function applyReplayFrame(s:Session,f:ReplayFrame):void{
  s.seconds=f.t;
  // Playback is not a live game phase. It can neither edit plans nor simulate.
  s.phase='running';s.mission=f.mission;
  for(const copy of f.actors){
    const a=s.operators.find(actor=>actor.id===copy.id);
    if(a)Object.assign(a,copy,{p:position(copy.p),
      spareMagazines:copy.spareMagazines.map(m=>({...m})),plan:[],nav:[]});
  }
  s.doors=f.doors.map(d=>({...d,a:position(d.a),b:position(d.b)}));
  s.shots=f.shots.map(shotCopy);
  s.casings=(f.casings??[]).map(x=>({...x}));
  s.dropped=f.dropped.map(m=>({...m,p:position(m.p)}));
  s.impactMarks=f.impactMarks.map(m=>({...m,p:position(m.p)}));
  s.grenades=f.grenades.map(g=>({...g,p:position(g.p),
    from:position(g.from),to:position(g.to)}));
  s.flashBursts=f.flashBursts.map(b=>({...b,p:position(b.p)}));
  s.flashRemaining=f.flashRemaining;
  s.missionType=f.missionType;s.holdTime=f.holdTime;
  s.rescue=f.rescue?{p:position(f.rescue.p),
    following:f.rescue.following}:null;
  s.scenario.objective=position(f.objective);
  s.seenGround=new Set(f.seenGround);
  s.intel=f.intel?intelRestore(f.intel):s.intel;
  s.intelObservedAt=f.t;
  s.known=new Map(f.known.map(([id,c])=>[id,
    {p:position(c.p),at:c.at,status:c.status}]));
}
