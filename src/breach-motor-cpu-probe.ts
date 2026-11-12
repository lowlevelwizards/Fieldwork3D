/** Opt-in CPU-only motor profiling. Never a simulation clock.
 * Keep all timing APIs outside the deterministic fixed-tick motor: only
 * callers supplying the diagnostic observer invoke these functions.
 */
export function beginMotorCpuMeasurement():number{
 return performance.now();
}
export function finishMotorCpuMeasurement(begin:number):number{
 return Math.max(0,performance.now()-begin);
}
