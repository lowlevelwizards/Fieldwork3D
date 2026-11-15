/** FN FAL 20-round steel mag. Similar class to G3, but its own magazine
 * silhouette and registration identity, shared with carried reload visuals.
 */
import type {Outline} from './profile-primitives.ts';
export const FAL_MAG20_CENTER_X=1.35;
export const FAL_MAG20_TOP_Y=-2.98;
export const FAL_MAG20_LENGTH=5.07;
/** Shared FAL rifle magazine depth matches the simplified G3 class. */
export const FAL_MAG20_DEPTH=2.08;
/** Reference-led side silhouette: deliberately sloped floorplate, rear heel
 * lower than front heel. One prism, no separate shoe or AK-like curvature.
 * Max visual drop remains -8.05 for historical pose/camera comparisons. */
export const FAL_MAG20_OUTLINE:Outline=[
 [-.26,-2.98],[2.96,-2.98],
 [2.96,-7.30],[2.80,-7.47],
 [-.12,-8.05],[-.26,-7.90]
];
