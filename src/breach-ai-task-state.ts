/** Shared NPC lifecycle transitions. Evidence memory stays separate;
 * these helpers own transient tasks, not perception or weapon permissions. */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
export function clearNpcSearch(a:TeamActor):void{
 a.searchOrigin=null;if(a.searchQueue.length)a.searchQueue=[];a.searchPauseUntil=0;a.searchRecoveryPending=false;
}
export function clearNpcCoordination(a:TeamActor,releaseDestination=false):void{
 if(releaseDestination&&a.coordinationOwnsDefense){a.defense=null;a.nav=[];}
 a.coordinationRole=null;a.coordinationUntil=0;
 a.coordinationReportId=undefined;a.coordinationPending=false;a.coordinationOwnsDefense=false;
 a.coordinationCandidates=undefined;
}
export function canAcceptNpcAssignment(a:TeamActor,now:number):boolean{
 return a.health>0&&!a.surrendered&&a.alert!=='retreat'&&!a.retreatPoint&&
  a.intent?.kind!=='engage'&&!(a.coordinationRole&&a.coordinationUntil>now);
}
export function commitNpcWithdrawal(a:TeamActor,point:Pt,now:number):void{
 clearNpcSearch(a);clearNpcCoordination(a);
 a.defense=null;a.retreatPoint={...point};a.alert='retreat';
 a.nav=[];a.defenseUntil=now+9;a.withdrawRetryAt=undefined;
}
export function clearNpcTasks(a:TeamActor):void{
 clearNpcSearch(a);clearNpcCoordination(a);
 a.contact=null;a.heard=null;a.contacted=false;a.watch=null;
 a.retreatPoint=null;a.defense=null;a.nav=[];a.alert='idle';
 a.checkedSearchAreas=[];a.lastSearchReportAt=undefined;
}

/** Both injury-driven and contact-driven withdrawal use one attempt owner.
 * The caller provides existing physical shelter lookup; retries are bounded.
 * preserveContactFallback retains the earlier contact-only hold response. */
export function attemptNpcWithdrawal(a:TeamActor,now:number,findShelter:()=>Pt|null,
 minimumDistance=0,preserveContactFallback=false):'committed'|'unavailable'|'deferred'{
 if(a.alert==='retreat'||now<(a.withdrawRetryAt??0))return 'deferred';
 const point=findShelter();
 if(point&&(minimumDistance===0||Math.hypot(point.x-a.p.x,point.y-a.p.y)>minimumDistance)){
  commitNpcWithdrawal(a,point,now);return 'committed';
 }
 if(preserveContactFallback){a.alert='cover';a.nav=[];a.defense=null;}
 a.withdrawRetryAt=now+1.5;return 'unavailable';
}
