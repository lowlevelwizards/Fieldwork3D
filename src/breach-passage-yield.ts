/** Q1: one bounded physical yield per observed opening/idle encounter.
 * A valid WAIT or queue HOLD never causes a new global escape search.
 * Keep memory scoped to Session; no renderer or global scene authority.
 */
import type {Session} from './breach-game.ts';
import type {Door} from './breach-core.ts';
type YieldLedger={leaf:Map<string,Set<string>>;idle:Set<string>};
const ledgers=new WeakMap<Session,YieldLedger>();
const ledger=(s:Session):YieldLedger=>{
 let l=ledgers.get(s);
 if(!l){l={leaf:new Map(),idle:new Set()};ledgers.set(s,l);}
 return l;
};
/** Reset only after the leaf actually returns to a fully shut state.
 * Reseeking opening angles should not create a fresh permission each tick.
 */
export function openingYieldAllowed(s:Session,door:Door,actorId:string):boolean{
 const l=ledger(s),key=door.id;
 if(!door.open&&(door.openFraction??0)<.03)l.leaf.delete(key);
 return !l.leaf.get(key)?.has(actorId);
}
export function commitOpeningYield(s:Session,door:Door,actorId:string):void{
 const l=ledger(s),key=door.id;
 let used=l.leaf.get(key);
 if(!used){used=new Set();l.leaf.set(key,used);}
 used.add(actorId);
}
/** An idle person may make ONE physical nudge for a given approaching
 * teammate. The key remains until the approaching teammate goes away.
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