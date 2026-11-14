/** D3.0: end-of-run, read-only evidence labels for generated-site audits.
 * No label pretends to prove reachability. A moving unit can still take a
 * detour, and a nonmoving unit can still have an intentionally blocked path.
 * This module is never called by the live actor motor or RAF.
 */
export type D3ProgressEvidence={
 planned:boolean;planComplete:boolean;activeOrder:string|null;
 motorPause:string|null;blockedTime:number;orderIssue:string|null;
 navCount:number;recentNetMovement:number;
};
export type D3ProgressLabel='unplanned'|'completed'|'order-issue'|
 'authored-hold'|'passage-hold'|'physical-block'|
 'moving'|'little-net-movement'|'door-opening-hold';
export function classifyD3Progress(e:D3ProgressEvidence):D3ProgressLabel{
 if(!e.planned)return 'unplanned';
 if(e.planComplete)return 'completed';
 if(e.orderIssue)return 'order-issue';
 // A deliberate WAIT/WATCH is not a failed door traversal.
 if(e.activeOrder==='wait'||e.activeOrder==='watch'||
    e.activeOrder==='holdClear'||e.activeOrder==='stack'||
    e.activeOrder==='sync')return 'authored-hold';
 if(e.motorPause==='passage')return 'passage-hold';
 if(e.motorPause==='door-opening'&&e.recentNetMovement<2)
  return 'door-opening-hold';
 if(e.blockedTime>=.85)return 'physical-block';
 // Net movement is evidence of activity, not proof of goalward progress.
 return e.recentNetMovement>=2?'moving':'little-net-movement';
}
