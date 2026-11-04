/** Studio-only automatic preview framing. No operator/gameplay state. */
import type {WardrobeSlot} from './operator-wardrobe-data.ts';

export type StudioCameraFocus={
 /** Model-space Y in the preview rig. */
 targetY:number;
 /** Orthographic magnification relative to full-operator fit. */
 zoom:number;
 /** Normally preserve the user's orbit; packs start at the rear. */
 side:'retain'|'back';
};
const FOCUS:Readonly<Record<WardrobeSlot,StudioCameraFocus>>={
 headwear:{targetY:44,zoom:2.35,side:'retain'},
 facewear:{targetY:42.7,zoom:2.55,side:'retain'},
 eyewear:{targetY:44,zoom:2.65,side:'retain'},
 headset:{targetY:42.5,zoom:2.35,side:'retain'},
 top:{targetY:30.6,zoom:1.65,side:'retain'},
 trousers:{targetY:15.1,zoom:1.50,side:'retain'},
 footwear:{targetY:4.4,zoom:2.10,side:'retain'},
 armorStyle:{targetY:31,zoom:1.70,side:'retain'},
 rigStyle:{targetY:28.6,zoom:1.72,side:'retain'},
 beltStyle:{targetY:23.0,zoom:2.00,side:'retain'},
 packStyle:{targetY:30.4,zoom:1.50,side:'back'},
 gloves:{targetY:25.6,zoom:1.97,side:'retain'},
 knees:{targetY:12.8,zoom:2.18,side:'retain'},
 wrist:{targetY:25.7,zoom:2.23,side:'retain'}
};
export const STUDIO_FULL_FIT={targetY:23,zoom:1} as const;
export const STUDIO_MIN_ZOOM=.7;
export const STUDIO_MAX_ZOOM=3.2;
export const studioCameraFocus=(slot:WardrobeSlot):StudioCameraFocus=>FOCUS[slot];
export const clampStudioCameraZoom=(z:number)=>
 Math.min(STUDIO_MAX_ZOOM,Math.max(STUDIO_MIN_ZOOM,Number.isFinite(z)?z:1));
/** Smoothstep with a bounded normalized input, to keep category changes calm. */
export function studioFocusEasing(t:number):number{
 if(!Number.isFinite(t))return 1;
 const x=Math.min(1,Math.max(0,t));
 return x*x*(3-2*x);
}
