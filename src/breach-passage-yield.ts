/** Q1 bounded physical yield episodes, scoped to Session and opening cycle.
 * A door still needs several 1.25-unit physical steps to clear a real
 * shoulder. Store a finite travel budget instead of stopping after one
 * step or permitting unlimited slow backwards drift.
 */
import type {Session} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
export const MAX_OPENING_YIELD_TRAVEL=32;
type YieldLedger={leaf:Map<string,Map<string,number>>;idle:Set<string>};
const ledgers=new WeakMap<Session,YieldLedger>();
const ledger=(s:Session):YieldLedger=>{
 let l=ledgers.get(s);
 if(!l){l={leaf:new Map(),idle:new Set()};ledgers.set(s,l);}
 return l;
};
export function openingYieldBudget(s:Session,door:Door,actorId:string):number{
 const l=ledger(s),key=door.id;
 // Reset when the panel has actually shut, never merely on a blocked tick.
 if(!door.open&&(door.openFraction??0)<.03)l.leaf.delete(key);
 return Math.max(0,MAX_OPENING_YIELD_TRAVEL-
  (l.leaf.get(key)?.get(actorId)??0));
}
export function commitOpeningYield(s:Session,door:Door,actorId:string,
 from:Pt,to:Pt):void{
 const l=ledger(s);
 let records=l.leaf.get(door.id);
 if(!records){records=new Map();l.leaf.set(door.id,records);}
 records.set(actorId,(records.get(actorId)??0)+Math.hypot(
  to.x-from.x,to.y-from.y));
}
/** Idle yielding cannot repeat for the same approaching actor while they
 * remain in the local passage region; a new person can request a new yield.
 */
export function idleYieldAllowed(s:Session,idleId:string,nearbyIds:readonly string[]):boolean{
 const l=ledger(s),prefix=idleId+'|';
 const active=new Set(nearbyIds.map(id=>prefix+id));
 for(const key of l.idle)if(key.startsWith(prefix)&&!active.has(key))l.idle.delete(key);
 return nearbyIds.some(id=>!l.idle.has(prefix+id));
}
export function commitIdleYield(s:Session,idleId:string,nearbyIds:readonly string[]):void{
 const l=ledger(s),prefix=idleId+'|';
 for(const id of nearbyIds)l.idle.add(prefix+id);
}