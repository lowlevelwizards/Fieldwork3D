/** PASGT-family field dress. Legacy choices are losslessly interpreted
 * as the closest visible period option; the authoritative shell is unchanged.
 */
import {readHelmetSetup} from './operator-helmet-setup-policy.ts';
export const PASGT_BANDS=['none','elastic'] as const;
export const PASGT_CONCEALMENTS=['none','foliage','scrim','net'] as const;
export type PasgtBand=typeof PASGT_BANDS[number];
export type PasgtConcealment=typeof PASGT_CONCEALMENTS[number];
export type PasgtDetails={
 /** Visible foliage buttonholes on the textile; concealment may require them. */
 slits:boolean;
 band:PasgtBand;
 concealment:PasgtConcealment;
};
export const PASGT_DEFAULT_DETAILS:Readonly<PasgtDetails>=Object.freeze({
 slits:true,band:'none',concealment:'none'
});
const allowed=<T extends string>(value:unknown,values:readonly T[],fallback:T):T=>
 typeof value==='string'&&values.includes(value as T)?value as T:fallback;
export const pasgtConcealmentRequiresSlits=(value:PasgtConcealment):boolean=>
 value==='foliage'||value==='scrim';
export function readPasgtDetails(value:unknown,legacyHelmetSetup?:unknown):PasgtDetails{
 const incoming:Record<string,unknown>=value&&typeof value==='object'&&!Array.isArray(value)?
  value as Record<string,unknown>:{};
 const old=legacyHelmetSetup===undefined?undefined:readHelmetSetup(legacyHelmetSetup);
 return {
  // Both legacy cover constructions become the one remaining slit style.
  slits:typeof incoming.slits==='boolean'?incoming.slits:true,
  band:incoming.band==='standard'||incoming.band==='crossed'?'elastic':
   allowed(incoming.band,PASGT_BANDS,old?.band==='elastic'?'elastic':'none'),
  concealment:allowed(incoming.concealment,PASGT_CONCEALMENTS,
   old?.scrim==='net'?'net':old?.scrim==='field'?'scrim':
   old?.scrim==='sparse'?'foliage':'none')
 };
}
/** Derive (never rewrite) effective cover behavior so disabling foliage or
 * scrim restores the user's previous no-slits preference. */
export function resolvePasgtDetails(value:unknown,legacyHelmetSetup?:unknown,
 covered=true):PasgtDetails{
 const d=readPasgtDetails(value,legacyHelmetSetup);
 return {...d,
  slits:d.slits||pasgtConcealmentRequiresSlits(d.concealment),
  // The net is tied to the retaining band when a cover is worn.
  // Saved manual band preference remains untouched and is restored
  // when net is deselected or the cover is removed.
  band:covered&&d.concealment==='net'?'elastic':d.band};
}
