/** P1.6: planning-only presentation LOS caching is the shipped default
 * after on-device A/B review. Explicit ?presentationSight=always and =legacy
 * remain available for comparison and rollback. Authoritative fog and LOS
 * never use this presentation-only policy.
 */
import type {Session} from '../breach-game.ts';
export type PresentationSightPolicy='always'|'planning'|'legacy';
export function presentationSightPolicy(query:string|null):PresentationSightPolicy{
 return query==='always'?'always':query==='legacy'?'legacy':'planning';
}
export function allowPresentationSightReuse(
 policy:PresentationSightPolicy,phase:Session['phase'],historical:boolean):boolean{
 if(historical||policy==='legacy')return false;
 return policy==='always'||phase!=='running';
}
