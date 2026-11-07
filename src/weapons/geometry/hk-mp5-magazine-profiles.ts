/** MP5 9mm: smooth, exceptionally slender curved steel magazine.
 * Reuses Fieldwork AK's normal-offset ribbon sampler, never the AK shape or ribs.
 * Single authoritative outline drives equipped, dropped and carried magazines.
 */
import {akMagazineCurve,akMagazineWidthPoints,type AKMagazineCurve} from './ak-magazine-profiles.ts';
import type {Outline} from './profile-primitives.ts';
export const MP5_MAG_CENTER_X=1.50;
export const MP5_MAG_TOP_Y=-2.35;
export const MP5_MAG_LENGTH=6.25;
export const MP5_MAG_WIDTH=1.92;
export const MP5_MAG_DEPTH=1.42;
export function mp5MagazineCurve():AKMagazineCurve{
 return {...akMagazineCurve('545',MP5_MAG_CENTER_X,MP5_MAG_TOP_Y,
  MP5_MAG_WIDTH,MP5_MAG_DEPTH),length:MP5_MAG_LENGTH,sweep:1.50,power:1.48};
}
export function mp5MagazineOutline():Outline{
 const curve=mp5MagazineCurve();
 const points=[0,.25,.50,.75,1].map(t=>akMagazineWidthPoints(curve,t));
 return [...points.map(p=>p[0]),...points.reverse().map(p=>p[1])];
}
export function mp5MagazineHeelOutline():Outline{
 const c=mp5MagazineCurve();
 const a=akMagazineWidthPoints(c,.967),b=akMagazineWidthPoints(c,1);
 return [a[0],a[1],b[1],b[0]];
}
