/** E3-B: restrained initiative only while an opponent is truly seen.
 * Candidate destinations are supplied and physically checked by the
 * established defensive-position selector in the session runtime.
 */
export type InitiativeFacts={
 personality:'guard'|'aggressor'|'cautious';
 directSight:boolean;clearFireLane:boolean;
 range:number;suppression:number;morale:number;
 nearbyAllies:number;secondsSinceLastMove:number;
};
export function pressureAdvanceOpportunity(f:InitiativeFacts):boolean{
 return f.personality==='aggressor'&&f.directSight&&
  f.clearFireLane&&f.range>125&&f.range<225&&
  f.suppression<.18&&f.morale>.68&&
  f.nearbyAllies>=1&&f.secondsSinceLastMove>6;
}
