/** Hysteretic navigation recovery. A failed step should not trigger full
 * A* or a new sidestep on every 30 Hz simulation tick. Player-authored
 * goals remain untouched; only transient execution hints may change. */
import type {Blocker} from './breach-nav-diagnostics.ts';
export type RecoveryAction='wait'|'detour'|'replan'|'report';
export function routeRetrySeconds(failures:number):number{
 return Math.min(3.2,.45+Math.max(0,failures)*.42);
}
export function recoveryAction(blocker:Blocker,stalled:number,
 secondsSinceRepair:number,failedRepairs=0):RecoveryAction{
 if(stalled<.30)return 'wait';
 // Once repeated world-truth repairs have failed, stop re-running path
 // search every cooldown. Escalate to a player-visible report only after a
 // longer bounded wait; subsequent reports are rate-limited by the caller's
 // last repair timestamp. The authored waypoint is never discarded.
 if(failedRepairs>=5&&stalled>4)
   return secondsSinceRepair>2?'report':'wait';
 if(secondsSinceRepair<.65)return 'wait';
 // An opposing body can temporarily yield, so begin with a local sidestep.
 // A persistent body blockage must eventually permit a real route repair;
 // otherwise 'detour' repeats forever even when no sidestep is feasible.
 if(blocker==='actor')
   return stalled<.65?'wait':stalled<1.7?'detour':'replan';
 if(blocker==='door')return stalled<.85?'wait':'replan';
 if(blocker==='furniture'||blocker==='wall'||blocker==='bounds')
   return 'replan';
 if(blocker==='route')return 'replan';
 return stalled>.8?'replan':'wait';
}
/** Resolved motion represents actual progress; stale recovery state must
 * reset or a subsequent order could inherit a previous blocked cooldown. */
export const madeProgress=(from:{x:number;y:number},to:{x:number;y:number})=>
 Math.hypot(to.x-from.x,to.y-from.y)>.05;
