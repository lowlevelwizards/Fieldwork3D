/** Retrospective director storyboard beats.
 * Reads a COMPLETE, already-recorded film once; never mutates the film,
 * visibility, AI or tactical simulation. Future evidence is used only to
 * choose a camera pose. Rendering still obeys the chosen replay disclosure.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import type {ReplayIndexedEvent} from './breach-replay-event-index.ts';
import type {Pt,Door} from './breach-core.ts';

export type DirectorFilmBeat={
  id:string;kind:'fight'|'door';
  start:number;first:number;last:number;end:number;
  actorId:string;shooterId:string|null;targetId:string|null;
  shooter:Pt;target:Pt;doorId:string|null;
};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const copy=(p:Pt):Pt=>({x:p.x,y:p.y});
const center=(door:Pick<Door,'a'|'b'>):Pt=>({
  x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2
});
const actorPosition=(frame:ReplayFrame|null,id:string|null,
  fallback:Pt):Pt=>{
  const actor=frame?.actors.find(a=>a.id===id);
  return actor&&Number.isFinite(actor.p.x)&&Number.isFinite(actor.p.y)?
    copy(actor.p):copy(fallback);
};
export function buildDirectorFilmBeats(
  shots:readonly RecordedShot[],events:readonly ReplayIndexedEvent[],
  at:(time:number)=>ReplayFrame|null,
  doors:readonly Pick<Door,'id'|'a'|'b'>[],
  friendlies:ReadonlySet<string>,
  eligible:(shot:RecordedShot)=>boolean
):DirectorFilmBeat[]{
  const beats:DirectorFilmBeat[]=[];
  const ordered=shots.filter(s=>eligible(s)&&
    Number.isFinite(s.recordedAt)&&Number.isFinite(s.start.x)&&
    Number.isFinite(s.end.x)).slice().sort((a,b)=>
      a.recordedAt-b.recordedAt||a.id-b.id);
  const previous=new Map<string,DirectorFilmBeat>();
  for(const shot of ordered){
    // An accurate shooter/target pair is taken from actual recorded
    // actor positions, not from a missed round's impact coordinate.
    const frame=at(shot.recordedAt);
    const shooter=actorPosition(frame,shot.shooterId,shot.start);
    const target=actorPosition(frame,shot.targetId,shot.end);
    const friendly=friendlies.has(shot.shooterId)?shot.shooterId:
      shot.targetId&&friendlies.has(shot.targetId)?shot.targetId:null;
    if(!friendly)continue;
    const pair=[shot.shooterId,shot.targetId??'impact'].sort().join(':');
    const existing=previous.get(pair);
    if(existing&&shot.recordedAt-existing.last<=1.15){
      existing.last=shot.recordedAt;
      existing.end=shot.recordedAt+1.05;
      // Retain the first decisive shot as the established composition.
      continue;
    }
    const t=shot.recordedAt;
    const beat:DirectorFilmBeat={
      id:'fight:'+shot.id,kind:'fight',start:Math.max(0,t-2.6),
      first:t,last:t,end:t+1.05,actorId:friendly,
      shooterId:shot.shooterId,targetId:shot.targetId,
      shooter,target,doorId:null
    };
    beats.push(beat);previous.set(pair,beat);
  }
  for(const event of events){
    if(event.kind!=='door'&&event.kind!=='flash'&&
      event.kind!=='interaction')continue;
    if(!event.actor||!friendlies.has(event.actor)||!Number.isFinite(event.t))
      continue;
    const frame=at(event.t);
    const near=event.p??frame?.actors.find(a=>a.id===event.actor)?.p;
    if(!near)continue;
    const door=doors.map(d=>({door,p:center(d)}))
      .sort((a,b)=>dist(a.p,near)-dist(b.p,near))[0];
    if(!door||dist(door.p,near)>52)continue;
    // Close repeats and flash/door interactions on the same leaf into
    // one planned breach shot; fight beats take precedence over it.
    if(beats.some(b=>b.kind==='door'&&b.doorId===door.door.id&&
      Math.abs(event.t-b.first)<1.1))continue;
    const operator=actorPosition(frame,event.actor,near);
    beats.push({id:'door:'+event.key,kind:'door',
      start:Math.max(0,event.t-3.2),first:event.t,
      last:event.t,end:event.t+.7,actorId:event.actor,
      shooterId:null,targetId:null,shooter:operator,
      target:door.p,doorId:door.door.id});
  }
  return beats.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
}
/** Fixed film-time lookup, not dependent on the last rendered frame. */
export function directorFilmBeatAt(
  time:number,beats:readonly DirectorFilmBeat[]
):DirectorFilmBeat|null{
  let best:DirectorFilmBeat|null=null,score=-Infinity;
  for(const beat of beats){
    if(beat.start>time)break;
    if(beat.end<time)continue;
    const until=Math.max(0,beat.first-time);
    const after=Math.max(0,time-beat.last);
    const candidate=(beat.kind==='fight'?100:56)-
      until*5-after*8;
    if(candidate>score){
      score=candidate;best=beat;
    }
  }
  return best;
}
/** The pair can move after the first shot. Always compose against the
 * sampled real actor positions when present, with recorded endpoints as
 * deterministic fallbacks. */
export function directorFilmPair(
  beat:DirectorFilmBeat,frame:ReplayFrame|null
):{shooter:Pt;target:Pt}|null{
  if(beat.kind!=='fight')return null;
  return {shooter:actorPosition(frame,beat.shooterId,beat.shooter),
    target:actorPosition(frame,beat.targetId,beat.target)};
}
