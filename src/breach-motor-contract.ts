/** Stage 7 motor port: simulation-only side effects owned by breach-game.
 * It is deliberately narrow: authoring, rendering, and replay cannot be
 * changed by an extracted movement subsystem.
 */
import type {Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {PassageSchedule} from './breach-passage-plan.ts';

export type ActorMotorHooks={
  notify:(session:Session,event:string)=>void;
  hear:(session:Session,point:Pt,radius:number,kind:string)=>void;
  battleEvent:(session:Session,kind:BattleEvent['kind'],actor:TeamActor|null,
    point:Pt,text:string)=>void;
  cachedEnemyRoute:(session:Session,from:Pt,to:Pt,physicalDoors?:boolean)=>Pt[];
  knownShoveCrossing:(session:Session,from:Pt,to:Pt)=>number|null;
  ensurePassageSchedule:(session:Session)=>PassageSchedule;
};
export const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clone=(p:Pt):Pt=>({...p});
export const clamp=(x:number,low:number,high:number)=>
 Math.max(low,Math.min(high,x));
export const angle=(a:Pt,b:Pt)=>Math.atan2(b.y-a.y,b.x-a.x);
