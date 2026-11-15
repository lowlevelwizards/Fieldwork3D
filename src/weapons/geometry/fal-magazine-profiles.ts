/** FN FAL 20-round steel mag. Similar class to G3, but its own magazine
 * silhouette and registration identity, shared with carried reload visuals.
 */
import type {Outline} from './profile-primitives.ts';
export const FAL_MAG20_CENTER_X=1.35;
export const FAL_MAG20_TOP_Y=-2.98;
export const FAL_MAG20_LENGTH=5.07;
/** Shared FAL rifle magazine depth matches the simplified G3 class. */
export const FAL_MAG20_DEPTH=1.62;
/** Reference-led side silhouette: deliberately sloped floorplate, rear heel
 * lower than front heel. One prism, no separate shoe or AK-like curvature.
 * Max visual drop remains -8.05 for historical pose/camera comparisons. */
export const FAL_MAG20_OUTLINE:Outline=[
 [-.54,-2.98],[3.24,-2.98],
 [3.24,-7.30],[3.08,-7.47],
 [-.40,-8.05],[-.54,-7.90]
];

/** Two parallel, restrained steel pressing ribs built from a shared
 * straight centerline — analogous to AK/STANAG ribbon constructions.
 * No independent protruding stamp geometry or needless beveling. */
export function falMagazineRibOutlines():Outline[]{
 const headY=FAL_MAG20_TOP_Y-.37,tailY=-7.40;
 return [-.68,.68].map(dx=>{
  const x=FAL_MAG20_CENTER_X+dx,half=.105;
  return [[x-half,headY],[x+half,headY],
   [x+half,tailY],[x-half,tailY]];
 });
}
