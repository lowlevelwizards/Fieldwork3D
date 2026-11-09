/** Opt-in CPU LOS-work counters.
 * Intentionally no wall-clock sampling in the live visibility loop.
 * Only a lightweight disabled-flag check is present during normal play.
 * Counts are geometric occlusion *evaluations*, not GPU raycasts or FPS.
 */
export type SightCostCounts={
 liveQueries:number;fullViewQueries:number;
 liveOcclusionProbes:number;liveHits:number;
 personalQueries:number;personalOcclusionProbes:number
};
export let sightDiagnosticsEnabled=false;
export const sightDiagnosticCounts:SightCostCounts={
 liveQueries:0,fullViewQueries:0,liveOcclusionProbes:0,
 liveHits:0,personalQueries:0,personalOcclusionProbes:0
};
function clear(){
 sightDiagnosticCounts.liveQueries=0;
 sightDiagnosticCounts.fullViewQueries=0;
 sightDiagnosticCounts.liveOcclusionProbes=0;
 sightDiagnosticCounts.liveHits=0;
 sightDiagnosticCounts.personalQueries=0;
 sightDiagnosticCounts.personalOcclusionProbes=0;
}
export function setSightDiagnosticsEnabled(value:boolean){
 sightDiagnosticsEnabled=value;
 clear();
}
/** Return a detached sample, then clear the interval. Never include
 * these counters in tactical state, recorded film or camera decisions.
 */
export function drainSightDiagnostics():SightCostCounts{
 const result={...sightDiagnosticCounts};
 clear();
 return result;
}
