/** HK33/HK53 steel magazines use the same NORMAL-offset ribbon sampler
 * as the AK family. This is deliberately NOT AK geometry or a STANAG feed.
 * The two HK magazines keep their own lengths, sweep and 5.56 attachment.
 * The single curve is authoritative for weapon, floorplate, ribs and kit.
 */
import {akMagazineCurve,akMagazineSample,akMagazineWidthPoints,
 type AKMagazineCurve,type Pt} from './ak-magazine-profiles.ts';
import type {Outline} from './profile-primitives.ts';

export const HK556_MAG_CENTER_X=1.35;
export const HK556_MAG_TOP_Y=-2.55;
export const HK556_MAG_LENGTHS={'hk556-mag25':5.55,'hk556-mag30':6.20} as const;
export type HK556MagazineId=keyof typeof HK556_MAG_LENGTHS;
const SWEEP:Readonly<Record<HK556MagazineId,number>>={
 'hk556-mag25':.80,'hk556-mag30':.90
};
/** R2: 0.80–0.90 sweep is visibly curved, but less than AK-74 (1.44).
 * Smooth top section with an increasingly pronounced curved toe.
 */
export function hk556MagazineCurve(id:HK556MagazineId):AKMagazineCurve{
 return {
  ...akMagazineCurve('545',HK556_MAG_CENTER_X,HK556_MAG_TOP_Y,2.90,1.90),
  length:HK556_MAG_LENGTHS[id],sweep:SWEEP[id],power:1.48
 };
}
/** Four spaced stations = one broad 8-corner, normal-width ribbon mesh. */
export function hk556MagazineOutline(id:HK556MagazineId):Outline{
 const curve=hk556MagazineCurve(id);
 const strips=[0,.34,.68,1].map(t=>akMagazineWidthPoints(curve,t));
 return [...strips.map(x=>x[0]),...strips.reverse().map(x=>x[1])];
}
/** Two side-embossed longitudinal lines, as on classic AK steel magazines.
 * Rib curves share the SAME centerline/normal math as the body.
 */
export function hk556MagazineRibOutlines(id:HK556MagazineId):Outline[]{
 const curve=hk556MagazineCurve(id);
 return [-.17,.17].map(offset=>{
  const left:Pt[]=[],right:Pt[]=[];
  for(const t of [.055,.32,.58,.90]){
   const p=akMagazineSample(curve,t),center=offset*curve.width,half=.175;
   left.push([p.x+p.nx*(center-half),p.y+p.ny*(center-half)]);
   right.push([p.x+p.nx*(center+half),p.y+p.ny*(center+half)]);
  }
  return [...left,...right.reverse()];
 });
}
/** Short single-piece heel follows the actual curved toe, not a flat bar
 * hovering at the old magazine center.
 */
export function hk556MagazineHeelOutline(id:HK556MagazineId):Outline{
 const c=hk556MagazineCurve(id);
 const upper=akMagazineWidthPoints(c,.965);
 const lower=akMagazineWidthPoints(c,1);
 return [upper[0],upper[1],lower[1],lower[0]];
}
