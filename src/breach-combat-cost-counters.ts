/** D2.1: opt-in work counts, never an alternative simulation or shot authority.
 * Captures BOTH 60Hz simulation and interpolated 3D rendering clearance.
 * Counts are evaluations/probes, not GPU rays or frame times.
 * Normal play pays one disabled boolean test in instrumented hot paths.
 */
export type CombatCostCounts={
 clearanceCalls:number;
 clearanceProbes:number;
 multiTargetLaneChecks:number;
 correctionSearches:number;
 correctionCandidates:number;
};
export let combatCostDiagnosticsEnabled=false;
export const combatCostCounts:CombatCostCounts={
 clearanceCalls:0,clearanceProbes:0,multiTargetLaneChecks:0,
 correctionSearches:0,correctionCandidates:0
};
function reset():void{
 combatCostCounts.clearanceCalls=0;
 combatCostCounts.clearanceProbes=0;
 combatCostCounts.multiTargetLaneChecks=0;
 combatCostCounts.correctionSearches=0;
 combatCostCounts.correctionCandidates=0;
}
export function setCombatCostDiagnosticsEnabled(enabled:boolean):void{
 combatCostDiagnosticsEnabled=enabled;
 reset();
}
/** Detached interval snapshot; never retained on Session or replay data. */
export function drainCombatCostDiagnostics():CombatCostCounts{
 const result={...combatCostCounts};
 reset();
 return result;
}
