/** Simulation stride is accumulated travel distance, NOT a phase fraction.
 * Convert once using a representative full left/right gait cycle in game
 * art units. A fixed cycle length preserves phase across speed and gait
 * changes. At 53 units/s this is ~1.4 cycles/s, not 53 cycles/s.
 * Pure distance sampling preserves replay and manual timeline seeking. */
export const RETENTION_STRIDE_DISTANCE=38;
export function retentionGaitPhase(distance:number):number{
 const d=Number.isFinite(distance)?distance:0;
 return (d%RETENTION_STRIDE_DISTANCE)/RETENTION_STRIDE_DISTANCE*Math.PI*2;
}
