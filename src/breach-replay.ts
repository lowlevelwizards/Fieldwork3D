/** Build 090–091: deterministic mission film, independent of the live motor.
 * We capture authoritative simulation outcomes at 20 Hz and never re-simulate
 * past actions. Rewind, scrubbing and speed changes cannot alter an outcome.
 */
import type {Session,TeamActor,ShotEvent,DroppedMagazine,FlashGrenade,FlashBurst,ImpactMark} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
import type {BattleEvent} from './breach-combat.ts';

export type ActorFrame=Pick<TeamActor,
  'id'|'p'|'heading'|'health'|'velocity'|'turning'|'posture'|'alert'|
  'magazine'|'reserve'|'reload'|'shots'|'fireCd'|'aim'|
  'lastHitAt'|'lastDownAt'|'flashUntil'|'suppression'|
  'weapon'|'injuryStage'|'morale'|'surrendered'|'defense'|'watch'|
  'lastThrowAt'>;
export type ReplayFrame={
  t:number;phase:Session['phase'];mission:Session['mission'];
  actors:ActorFrame[];doors:Door[];shots:ShotEvent[];
  dropped:DroppedMagazine[];impactMarks:ImpactMark[];grenades:FlashGrenade[];
  flashBursts:FlashBurst[];flashRemaining:number;
  missionType:Session['missionType'];holdTime:number;
  rescue:{p:Pt;following:string|null}|null;
  seenGround:string[];known:[string,{p:Pt;at:number;status:'seen'|'heard'}][];
};
const position=(p:Pt):Pt=>({x:p.x,y:p.y});
const shotCopy=(shot:ShotEvent):ShotEvent=>({...shot,
  start:position(shot.start),end:position(shot.end)});
export function snapshot(s:Session):ReplayFrame{
  return {
    t:s.seconds,phase:s.phase,mission:s.mission,
    actors:s.operators.map(a=>({id:a.id,p:position(a.p),
      heading:a.heading,health:a.health,velocity:a.velocity,
      turning:a.turning,posture:a.posture,alert:a.alert,
      magazine:a.magazine,reserve:a.reserve,reload:a.reload,
      shots:a.shots,fireCd:a.fireCd,aim:a.aim,
      lastHitAt:a.lastHitAt,lastDownAt:a.lastDownAt,
      flashUntil:a.flashUntil,suppression:a.suppression,
      weapon:a.weapon,injuryStage:a.injuryStage,morale:a.morale,
      lastThrowAt:a.lastThrowAt,
      surrendered:a.surrendered,defense:a.defense?position(a.defense):null,
      watch:a.watch?position(a.watch):null})),
    doors:s.doors.map(d=>({...d,a:position(d.a),b:position(d.b)})),
    shots:s.shots.map(shotCopy),
    dropped:s.dropped.map(m=>({...m,p:position(m.p)})),
    impactMarks:s.impactMarks.map(m=>({...m,p:position(m.p)})),
    grenades:s.grenades.map(g=>({...g,p:position(g.p),
      from:position(g.from),to:position(g.to)})),
    flashBursts:s.flashBursts.map(b=>({...b,p:position(b.p)})),
    flashRemaining:s.flashRemaining,
    missionType:s.missionType,holdTime:s.holdTime,
    rescue:s.rescue?{p:position(s.rescue.p),following:s.rescue.following}:null,
    seenGround:[...s.seenGround],
    known:[...s.known].map(([id,c])=>[id,
      {p:position(c.p),at:c.at,status:c.status}]),
  };
}
export class MissionRecorder{
  readonly frames:ReplayFrame[]=[];
  readonly events:BattleEvent[]=[];
  private lastEventId=0;
  capture(s:Session,force=false):void{
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
    const frame=snapshot(s);
    // Explored ground only grows. Reuse identical history instead of
    // allocating thousands of duplicate tile arrays during long missions.
    if(last&&last.seenGround.length===frame.seenGround.length)
      frame.seenGround=last.seenGround;
    this.frames.push(frame);
  }
  get duration(){return this.frames.at(-1)?.t??0;}
  at(time:number):ReplayFrame|null{
    if(!this.frames.length)return null;
    const t=Math.max(0,Math.min(time,this.duration));
    let lo=0,hi=this.frames.length-1;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      if(this.frames[mid].t<=t)lo=mid;
      else hi=mid-1;
    }
    return this.frames[lo];
  }
}
export function applyReplayFrame(s:Session,f:ReplayFrame):void{
  s.seconds=f.t;
  // Playback is not a live game phase. It can neither edit plans nor simulate.
  s.phase='running';s.mission=f.mission;
  for(const copy of f.actors){
    const a=s.operators.find(actor=>actor.id===copy.id);
    if(a)Object.assign(a,copy,{p:position(copy.p),plan:[],nav:[]});
  }
  s.doors=f.doors.map(d=>({...d,a:position(d.a),b:position(d.b)}));
  s.shots=f.shots.map(shotCopy);
  s.dropped=f.dropped.map(m=>({...m,p:position(m.p)}));
  s.impactMarks=f.impactMarks.map(m=>({...m,p:position(m.p)}));
  s.grenades=f.grenades.map(g=>({...g,p:position(g.p),
    from:position(g.from),to:position(g.to)}));
  s.flashBursts=f.flashBursts.map(b=>({...b,p:position(b.p)}));
  s.flashRemaining=f.flashRemaining;
  s.missionType=f.missionType;s.holdTime=f.holdTime;
  s.rescue=f.rescue?{p:position(f.rescue.p),
    following:f.rescue.following}:null;
  s.seenGround=new Set(f.seenGround);
  s.known=new Map(f.known.map(([id,c])=>[id,
    {p:position(c.p),at:c.at,status:c.status}]));
}
