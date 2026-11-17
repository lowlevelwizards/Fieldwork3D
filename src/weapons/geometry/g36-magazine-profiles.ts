/** G36 P7.2 — visual sweep experiment only.
 * P6 baseline and one more expressive polymer curve share the same mouth,
 * width, length, thickness and underlying centerline mathematics.
 * Neither has any relationship to STANAG feed compatibility.
 */
import {arMagazineCurve,arMagazineOutline}
 from './ar-magazine-profiles.ts';
import type {Outline} from './profile-primitives.ts';

const common=arMagazineCurve('30',.45,-2.62,3.32,1.83);
export const G36_MAG30_CURVE_P6=Object.freeze({...common,sweep:.64,power:1.62});
export const G36_MAG30_CURVE_CANDIDATE=Object.freeze({...common,sweep:.98,power:1.62});
// The production choice remains P6 until one-variable visual evaluation.
export const G36_MAG30_CURVE=G36_MAG30_CURVE_P6;
export const G36_MAG30_OUTLINE:Outline=arMagazineOutline(G36_MAG30_CURVE);
export const G36_MAG30_OUTLINE_CANDIDATE:Outline=arMagazineOutline(G36_MAG30_CURVE_CANDIDATE);
export const G36_MAG30_DEPTH=G36_MAG30_CURVE.depth;
