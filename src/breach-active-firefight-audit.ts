/** R7D: active (ordered) fight diagnostics. These are observations of
 * authoritative simulation and MissionRecorder events, not guesses about a
 * human playthrough. The caller explicitly records any failed plan.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {BattleEvent} from './breach-combat.ts';
import {assessMissionFilm} from './breach-mission-quality.ts';

export type ActiveTrial={
 seed:number;mission:string;ordersAccepted:number;
 movedOperators:number;maxTravel:number;
 firstContactAt:number|null;firstShotAt:number|null;shots:number;
 wounded:number;downed:number;finished:boolean;
 frameCount:number;issues:string[];
};
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
export function assessActiveTrial(seed:number,mission:string,
 ordersAccepted:number,frames:readonly ReplayFrame[],
 events:readonly BattleEvent[]):ActiveTrial{
 const film=assessMissionFilm(frames,events,frames[0]?.actors.length);
 const first=frames[0]?.actors??[],last=frames.at(-1)?.actors??[];
 const moved=first.map(actor=>{
  const current=last.find(a=>a.id===actor.id);
  return actor.id.startsWith('guard')||!current?0:
    dist(current.p,actor.p);
 });
 const maxTravel=Math.round(Math.max(0,...moved)*10)/10;
 const issues=[...film.issues];
 if(!ordersAccepted)issues.push('no accepted operator orders');
 if(ordersAccepted&&!moved.some(x=>x>2))
  issues.push('orders accepted but operators made no progress');
 return {seed,mission,ordersAccepted,
  movedOperators:moved.filter(x=>x>2).length,maxTravel,
  firstContactAt:film.firstContactAt,firstShotAt:film.firstShotAt,
  shots:events.filter(e=>e.kind==='shot').length,
  wounded:events.filter(e=>e.kind==='wound').length,
  downed:events.filter(e=>e.kind==='down').length,
  finished:frames.at(-1)?.phase==='won',
  frameCount:frames.length,issues};
}
export function summarizeActiveTrials(rows:readonly ActiveTrial[]){
 const sum=(f:(r:ActiveTrial)=>number)=>rows.reduce((n,r)=>n+f(r),0);
 return {sampled:rows.length,planned:sum(r=>Number(r.ordersAccepted>0)),
  moving:sum(r=>Number(r.movedOperators>0)),
  contacts:sum(r=>Number(r.firstContactAt!==null)),
  withShots:sum(r=>Number(r.firstShotAt!==null)),shots:sum(r=>r.shots),
  wounds:sum(r=>r.wounded),downs:sum(r=>r.downed),
  finished:sum(r=>Number(r.finished)),
  issues:sum(r=>r.issues.length),
  noContact:rows.filter(r=>r.firstContactAt===null).map(r=>r.seed)};
}
