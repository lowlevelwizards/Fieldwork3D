/** G36 P5.3 — G36-exclusive translucent-polymer miniature outline.
 * Reuse proven centerline/normal mathematics, not the stamped STANAG
 * silhouette or physical magazine feed compatibility. Same mouth and heel.
 */
import {arMagazineCurve,arMagazineOutline}
 from './ar-magazine-profiles.ts';
import type {Outline} from './profile-primitives.ts';
const common=arMagazineCurve('30',.45,-2.62,3.32,1.83);
export const G36_MAG30_CURVE=Object.freeze({
 ...common,sweep:.64,power:1.62
});
export const G36_MAG30_OUTLINE:Outline=arMagazineOutline(G36_MAG30_CURVE);
export const G36_MAG30_DEPTH=G36_MAG30_CURVE.depth;
