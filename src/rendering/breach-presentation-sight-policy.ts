/** P1.5a: explicit, benchmarkable presentation-only LOS cache strategy.
 * Keep current shipped behavior by default until a real mobile A/B proves
 * execution bypass is worth the cost. No change to authoritative visibility.
 */
import type {Session} from '../breach-game.ts';
export type PresentationSightPolicy='always'|'planning'|'legacy';
export function presentationSightPolicy(query:string|null):PresentationSightPolicy{
 return query==='planning'?'planning':query==='legacy'?'legacy':'always';
}
export function allowPresentationSightReuse(
 policy:PresentationSightPolicy,phase:Session['phase'],historical:boolean):boolean{
 if(historical||policy==='legacy')return false;
 return policy==='always'||phase!=='running';
}
