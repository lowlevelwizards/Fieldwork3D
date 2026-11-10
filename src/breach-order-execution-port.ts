/** Roadmap 2 / Stage 8: the fixed 60 Hz game owns the clock, world effects
 * and movement. Order handlers only consume this stable, typed service port.
 * No renderer, global clock, editable plan-authoring, or secret world state.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {Pt,Door} from './breach-core.ts';
import type {BattleEvent} from './breach-combat.ts';

export type OrderExecutionPort={
 approach:(actor:TeamActor,point:Pt,dt:number,session:Session,speedScale?:number)=>boolean;
 advanceTraversal:(actor:TeamActor,session:Session,dt:number)=>boolean;
 notify:(session:Session,message:string)=>void;
 hear:(session:Session,point:Pt,radius:number,kind:string)=>void;
 battleEvent:(session:Session,kind:BattleEvent['kind'],actor:TeamActor|null,point:Pt,text:string)=>void;
 inSight:(actor:TeamActor,target:TeamActor,session:Session)=>boolean;
 liveVisibility:(session:Session,point:Pt)=>boolean;
 pairedLeaves:(session:Session,door:Door)=>Door[];
 movePhysicalProp:(session:Session,index:number,point:Pt)=>boolean;
 beginReload:(session:Session,actor:TeamActor)=>boolean;
};
