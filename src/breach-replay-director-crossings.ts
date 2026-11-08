/** R8 recorded threshold crossings. Derived from the actual 20 Hz film,
 * never from intent, majority-room guesses, or current live simulation.
 * The intermediate weak side (inside the door plane) is deliberately
 * ignored to reject threshold jitter and short reverse movements.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {Door,Pt} from './breach-core.ts';

export type DirectorEntryEvent={
  id:string;doorId:string;actorId:string;t:number;
  fromSide:-1|1;toSide:-1|1;sequenceId:string;first:boolean;
};
type StableSide={side:-1|1;position:Pt;time:number};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function signed(door:Pick<Door,'a'|'b'>,p:Pt){
  const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
  return (dx*(p.y-door.a.y)-dy*(p.x-door.a.x))/
    Math.max(.001,Math.hypot(dx,dy));
}
function withinAperture(door:Pick<Door,'a'|'b'>,a:Pt,b:Pt){
  const da=signed(door,a),db=signed(door,b);
  if(da*db>=0)return false;
  const t=da/(da-db);
  if(t<0||t>1)return false;
  const x=a.x+(b.x-a.x)*t-door.a.x;
  const y=a.y+(b.y-a.y)*t-door.a.y;
  const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
  const along=(x*dx+y*dy)/Math.max(1,dx*dx+dy*dy);
  // Require crossing through the actual aperture, not its extended wall.
  return along>=.08&&along<=.92;
}
/** Consume already-stored replay frames rather than resampling the film.
 * Cost is linear in the number of actors near a door and recorded frames.
 */
export function buildDirectorEntryEvents(
  frames:readonly Pick<ReplayFrame,'t'|'actors'>[],
  doors:readonly Pick<Door,'id'|'a'|'b'>[],
  friendlies:ReadonlySet<string>
):DirectorEntryEvent[]{
  const events:DirectorEntryEvent[]=[];
  const stable=new Map<string,StableSide>();
  const sequences=new Map<string,{id:string;last:number;count:number}>();
  const ordered=[...frames].sort((a,b)=>a.t-b.t);
  for(const frame of ordered){
    for(const actor of frame.actors){
      if(!friendlies.has(actor.id)||actor.health<=0)continue;
      if(!Number.isFinite(actor.p.x)||!Number.isFinite(actor.p.y))continue;
      for(const door of doors){
        const mid={x:(door.a.x+door.b.x)*.5,
          y:(door.a.y+door.b.y)*.5};
        const key=actor.id+'|'+door.id;
        // Distant actors cannot cross this doorway between nearby frames.
        if(distance(actor.p,mid)>68){
          stable.delete(key);
          continue;
        }
        const ds=signed(door,actor.p);
        if(Math.abs(ds)<5)continue;
        const side:-1|1=ds>0?1:-1;
        const previous=stable.get(key);
        if(previous&&previous.side!==side&&
            frame.t-previous.time<1.4&&
            distance(previous.position,actor.p)<95&&
            withinAperture(door,previous.position,actor.p)){
          const from=previous.side;
          const seqKey=door.id+'|'+from;
          const old=sequences.get(seqKey);
          const first=!old||frame.t-old.last>2.1;
          const id=first?
            door.id+':'+from+':'+frame.t.toFixed(3):old!.id;
          const entry:DirectorEntryEvent={
            id:door.id+':'+actor.id+':'+frame.t.toFixed(3),
            doorId:door.id,actorId:actor.id,t:frame.t,
            fromSide:from,toSide:side,sequenceId:id,first
          };
          events.push(entry);
          sequences.set(seqKey,{id,last:frame.t,
            count:(first?0:old!.count)+1});
        }
        stable.set(key,{side,position:{...actor.p},time:frame.t});
      }
    }
  }
  return events.sort((a,b)=>a.t-b.t||
    a.actorId.localeCompare(b.actorId));
}
/** The actual first entrant is the only automatic scene-change cue.
 * Can be used just before crossing to prepare a composition, but never
 * to reveal an enemy or other future-only subject.
 */
export function directorFirstEntryAt(time:number,
  entries:readonly DirectorEntryEvent[],before=.25,after=1.4
):DirectorEntryEvent|null{
  let best:DirectorEntryEvent|null=null;
  for(const event of entries){
    if(event.t>time+before)break;
    if(!event.first||time-event.t>after)continue;
    if(!best||Math.abs(event.t-time)<Math.abs(best.t-time))
      best=event;
  }
  return best;
}
