/** Bounded pack inertia derived from authoritative body acceleration.
 * No free-running springs, allocations or frame-time dependency.
 */
export function packInertia(acceleration:number,torsoSide:number){
 const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
 const impulse=clamp(acceleration/200,-1,1);
 return {lean:clamp(-impulse*.027+torsoSide*.12,-.040,.040),
   side:clamp(-impulse*.15+torsoSide*.38,-.22,.22)};
}
