/** P2: G36 polymer uses the established STANAG 30-round outline language.
 * Geometry reuse is visual ONLY: the g36poly556 family feed stays exclusive.
 * A dedicated G36 tint and pixel atlas preserve the authored appearance.
 */
import {arMagazineCurve,arMagazineOutline}
 from './ar-magazine-profiles.ts';
import type {Outline} from './profile-primitives.ts';
export const G36_MAG30_CURVE=arMagazineCurve('30',.45,-2.62,3.08,1.83);
export const G36_MAG30_OUTLINE:Outline=arMagazineOutline(G36_MAG30_CURVE);
export const G36_MAG30_DEPTH=G36_MAG30_CURVE.depth;
