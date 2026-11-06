/** Replay R3 forensic shot queries. Every result is an original simulation
 * outcome; never cast replacement rays or infer damage from screen positions.
 */
import type {RecordedShot} from './breach-replay-ballistics.ts';
import type {ReplayKnowledge} from './breach-replay-visibility.ts';
import type {Pt} from './breach-core.ts';

export type ReplayShotView={
  id:number;time:number;shooterId:string;targetId:string|null;
  weapon:string;hit:boolean;down:boolean;surface:string|null;
  start:Pt;end:Pt;healthBefore:number|null;healthAfter:number|null;
  hitRegion:string|null;
};
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
/** Target/hit details are redacted when only the shooter was disclosed. */
export function inspectRecordedShot(shot:RecordedShot,
  knowledge:ReplayKnowledge|null,omniscient:boolean):ReplayShotView{
  const targetKnown=omniscient||!shot.targetId||
    !!knowledge&&(knowledge.visibleActorIds.includes(shot.targetId)||
      knowledge.discoveredBodyIds.includes(shot.targetId));
  return {
    id:shot.id,time:shot.recordedAt,shooterId:shot.shooterId,
    targetId:targetKnown?shot.targetId:null,
    weapon:shot.weaponAtFire??'UNKNOWN',
    hit:targetKnown?shot.hit:false,
    down:targetKnown?shot.down:false,
    surface:targetKnown?shot.surface??null:null,
    start:clone(shot.start),end:clone(shot.end),
    healthBefore:targetKnown?shot.healthBefore:null,
    healthAfter:targetKnown?shot.healthAfter:null,
    hitRegion:targetKnown?shot.hitRegion??null:null
  };
}
export function shotScreenHit(
  shots:readonly RecordedShot[],time:number,
  screen:Pt,project:(p:Pt,height:number)=>Pt,
  allowed:(shot:RecordedShot)=>boolean,radius=26
):RecordedShot|null{
  let best:RecordedShot|null=null,bestDist=radius;
  for(const shot of shots){
    if(shot.recordedAt>time+1e-6||
      shot.recordedAt<time-3||!allowed(shot))continue;
    const end=project(shot.end,shot.impactHeight??7);
    const d=Math.hypot(end.x-screen.x,end.y-screen.y);
    if(d<bestDist){bestDist=d;best=shot;}
  }
  return best;
}
export function adjacentRecordedShot(
  shots:readonly RecordedShot[],currentId:number,
  forward:boolean,allowed:(s:RecordedShot)=>boolean
):RecordedShot|null{
  const i=shots.findIndex(s=>s.id===currentId);
  if(i<0)return null;
  for(let n=i+(forward?1:-1);n>=0&&n<shots.length;n+=forward?1:-1)
    if(allowed(shots[n]))return shots[n];
  return null;
}
