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
 if(failedRepairs>=5&&stalled>4&&secondsSinceRepair>2)return 'report';
 if(secondsSinceRepair<.65)return 'wait';
 if(blocker==='actor')return stalled<.65?'wait':'detour';
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
