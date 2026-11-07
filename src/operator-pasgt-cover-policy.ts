/** PASGT-family field dress — few visually distinct choices.
 * No modern mounts, tiny factory variants, or duplicate shell geometry.
 * Saved old H1 choices can be interpreted without modifying persisted data.
 */
import {readHelmetSetup} from './operator-helmet-setup-policy.ts';
export const PASGT_CONSTRUCTIONS=['slits','loops'] as const;
export const PASGT_BANDS=['none','standard','crossed'] as const;
export const PASGT_CONCEALMENTS=['none','foliage','scrim','net'] as const;
export type PasgtConstruction=typeof PASGT_CONSTRUCTIONS[number];
export type PasgtBand=typeof PASGT_BANDS[number];
export type PasgtConcealment=typeof PASGT_CONCEALMENTS[number];
export type PasgtDetails={
 construction:PasgtConstruction;
 band:PasgtBand;
 concealment:PasgtConcealment;
};
export const PASGT_DEFAULT_DETAILS:Readonly<PasgtDetails>=Object.freeze({
 construction:'slits',band:'none',concealment:'none'
});
const allowed=<T extends string>(value:unknown,values:readonly T[],fallback:T):T=>
 typeof value==='string'&&values.includes(value as T)?value as T:fallback;
export function readPasgtDetails(value:unknown,legacyHelmetSetup?:unknown):PasgtDetails{
 const incoming=value&&typeof value==='object'&&!Array.isArray(value)?
  value as Partial<PasgtDetails>:{};
 const old=legacyHelmetSetup===undefined?undefined:readHelmetSetup(legacyHelmetSetup);
 return {
  construction:allowed(incoming.construction,PASGT_CONSTRUCTIONS,'slits'),
  band:allowed(incoming.band,PASGT_BANDS,old?.band==='elastic'?'standard':'none'),
  concealment:allowed(incoming.concealment,PASGT_CONCEALMENTS,
   old?.scrim==='net'?'net':old?.scrim==='field'?'scrim':
   old?.scrim==='sparse'?'foliage':'none')
 };
}
