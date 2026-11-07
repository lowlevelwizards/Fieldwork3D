/** Replay R4.4 — measured four-person threshold flow.
 * Only the authoritative friendly positions and recorded door geometry
 * may support a crossing claim. No live navigation, inferred intent,
 * hidden contacts, future frames or retroactive tactical verdicts.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {Door,Pt} from './breach-core.ts';

export type ReplayDoorCrossing={
  actorId:string;crossedAt:number|null;
  /** Evidence of being beyond the threshold at window start, not a crossing. */
  alreadyBeyond:boolean;
  /** Measured elapsed time after previous crossing, not a delay estimate. */
  secondsAfterPrevious:number|null;
};
export type ReplaySquadEntryReview={
  doorId:string;start:number;end:number;
  approachSide:-1|1|null;
  sampledFrames:number;
  crossings:ReplayDoorCrossing[];
  firstCrossingAt:number|null;lastCrossingAt:number|null;
  /** Only meaningful when at least two real crossings are recorded. */
  spreadSeconds:number|null;
};
const signedDistance=(p:Pt,door:Pick<Door,'a'|'b'>):number=>{
  const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
  const length=Math.hypot(dx,dy);
  return length>0&&Number.isFinite(length)?
    (dx*(p.y-door.a.y)-dy*(p.x-door.a.x))/length:NaN;
};
const side=(distance:number,tolerance:number):-1|0|1=>
  distance>tolerance?1:distance< -tolerance?-1:0;

/** Find actual arrivals on the opposite physical side of a door.
 * A team split evenly across the door at first observation is ambiguous:
 * report no approach side rather than invent an entry direction.
 * When the replay window starts after someone entered, mark alreadyBeyond.
 */
export function measureReplaySquadDoorEntry(
  frames:readonly ReplayFrame[],doorId:string,
  friendlyIds:readonly string[],start:number,end:number,
  tolerance=6
):ReplaySquadEntryReview|null{
  if(!doorId||!Number.isFinite(start)||!Number.isFinite(end)||
    start<0||end<=start||!Number.isFinite(tolerance)||tolerance<=0)
    return null;
  const ids=[...new Set(friendlyIds.filter(Boolean))].slice(0,8);
  if(!ids.length)return null;
  // MissionRecorder stores monotone samples. Avoid resorting up to
  // 12,000 frames once per doorway on mobile. An invalid order fails closed.
  const film=frames.filter(f=>Number.isFinite(f.t)&&f.t>=start&&
    f.t<=end);
  if(!film.length)return null;
  for(let i=1;i<film.length;i++)
    if(film[i].t<film[i-1].t)return null;
  const doorway=film[0].doors.find(d=>d.id===doorId);
  if(!doorway||!Number.isFinite(signedDistance(doorway.a,doorway)))
    return null;
  const first=film[0];
  let plus=0,minus=0;
  for(const id of ids){
    const a=first.actors.find(x=>x.id===id);
    if(!a)continue;
    const sign=side(signedDistance(a.p,doorway),tolerance);
    if(sign===1)plus++;
    if(sign===-1)minus++;
  }
  const approachSide:-1|1|null=plus===minus?null:
    plus>minus?1:-1;
  const rows=new Map<string,ReplayDoorCrossing>();
  const seenApproach=new Set<string>();
  for(const id of ids){
    const original=first.actors.find(a=>a.id===id);
    const s=original?side(signedDistance(original.p,doorway),tolerance):0;
    rows.set(id,{actorId:id,crossedAt:null,
      alreadyBeyond:approachSide!==null&&s===-approachSide,
      secondsAfterPrevious:null});
  }
  if(approachSide!==null)for(const frame of film){
    for(const actor of frame.actors){
      if(!rows.has(actor.id)||actor.health<=0||actor.carriedById)continue;
      const row=rows.get(actor.id)!;
      if(row.crossedAt!==null||row.alreadyBeyond)continue;
      const sign=side(signedDistance(actor.p,doorway),tolerance);
      if(sign===approachSide)seenApproach.add(actor.id);
      if(sign===-approachSide&&seenApproach.has(actor.id))
        row.crossedAt=frame.t; // first observed far-side sample
    }
  }
  const measured=[...rows.values()].filter(x=>x.crossedAt!==null)
    .sort((a,b)=>a.crossedAt!-b.crossedAt!||
      ids.indexOf(a.actorId)-ids.indexOf(b.actorId));
  for(let i=1;i<measured.length;i++)
    measured[i].secondsAfterPrevious=
      Math.max(0,measured[i].crossedAt!-measured[i-1].crossedAt!);
  const firstAt=measured[0]?.crossedAt??null;
  const lastAt=measured.at(-1)?.crossedAt??null;
  return {doorId,start,end,approachSide,sampledFrames:film.length,
    crossings:ids.map(id=>rows.get(id)!),
    firstCrossingAt:firstAt,lastCrossingAt:lastAt,
    spreadSeconds:measured.length>=2&&firstAt!==null&&lastAt!==null?
      Math.max(0,lastAt-firstAt):null};
}

/** Prioritize entries with actual friendly crossings, not door opens.
 * This index is built once on replay entry and never during rendering.
 * Do not show a “four-person clear” if only some operators crossed.
 */
export function featuredReplaySquadEntries(
  frames:readonly ReplayFrame[],friendlyIds:readonly string[],
  duration:number,limit=3
):ReplaySquadEntryReview[]{
  if(!Number.isFinite(duration)||duration<=0||limit<=0||
    !frames.length)return [];
  const ids=[...new Set(frames[0].doors.map(d=>d.id))].slice(0,80);
  const results=ids.map(id=>measureReplaySquadDoorEntry(
    frames,id,friendlyIds,0,duration))
    .filter((x):x is ReplaySquadEntryReview=>
      !!x&&x.crossings.some(c=>c.crossedAt!==null));
  const measured=(r:ReplaySquadEntryReview)=>
    r.crossings.filter(c=>c.crossedAt!==null).length;
  return results.sort((x,y)=>measured(y)-measured(x)||
    (x.firstCrossingAt??Infinity)-(y.firstCrossingAt??Infinity)||
    x.doorId.localeCompare(y.doorId)).slice(0,Math.floor(limit));
}
