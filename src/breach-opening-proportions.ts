/** Shared architecture dimensions in the same world units as door models.
 * Keep aperture styling legible at the standing eye line (32u), with
 * doors at 51u and walls at 56u. Generation, rendering, cover height and
 * climb clearance must use compatible physical aperture dimensions.
 */
import type {WindowStyle} from './breach-site.ts';
export const WINDOW_SILL_VISUAL_DEFAULT=14;
export const SERVING_COUNTER_VISUAL_HEIGHT=24;
const head:Record<WindowStyle,number>={
 standard:43,tall:49,picture:47,bay:44,
 industrial:41,clerestory:51,awning:43,wire:42,storefront:50
};
export function windowVisualHeadHeight(style:WindowStyle='standard'):number{
 return head[style];
}
