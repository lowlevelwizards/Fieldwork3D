/** FN FAL 20-round steel mag. Similar class to G3, but its own magazine
 * silhouette and registration identity, shared with carried reload visuals.
 */
import type {Outline} from './profile-primitives.ts';
export const FAL_MAG20_CENTER_X=1.35;
export const FAL_MAG20_TOP_Y=-2.98;
export const FAL_MAG20_LENGTH=5.07;
/** Shared FAL rifle magazine depth matches the simplified G3 class. */
export const FAL_MAG20_DEPTH=2.08;
export const FAL_MAG20_OUTLINE:Outline=[
 [-.36,-2.98],[3.10,-2.98],
 [3.12,-7.61],[2.96,-8.05],
 [-.08,-8.05],[-.34,-7.69]
];
