/** Compact, gently curving steel HK 5.56 magazines, not AK banana curves.
 * Identical authored outline is used on the rifle and in carried kit.
 */
import type {Outline} from './profile-primitives.ts';
export const HK556_MAG_CENTER_X=1.35;
export const HK556_MAG_TOP_Y=-2.55;
export const HK556_MAG_LENGTHS={'hk556-mag25':5.55,'hk556-mag30':6.20} as const;
export type HK556MagazineId=keyof typeof HK556_MAG_LENGTHS;
export function hk556MagazineOutline(id:HK556MagazineId):Outline{
 const top=HK556_MAG_TOP_Y,bottom=top-HK556_MAG_LENGTHS[id];
 // Broadly parallel upper sides; about half a unit of total lower drift.
 return [
  [-.10,top],[2.80,top],[3.02,top-2.15],
  [3.18,bottom+.48],[3.00,bottom],[.59,bottom],
  [.36,bottom+.42],[.12,top-2.15]
 ];
}
