/** MF-3: photographic miniature / tilt-shift presentation only. */
export type MiniatureFocusMode='off'|'subtle'|'strong'|'replay';
export type MiniatureFocusView='tactical'|'top'|'floor-plan'|
  'director'|'free-replay'|'bodycam';
export type FocusQuality='performance'|'balanced'|'quality';
export type FocusDecision={
 active:boolean;radiusPx:number;strength:number;
 centerY:number;innerHalfHeight:number;outerHalfHeight:number;
 saturation:number;contrast:number;reason:string;
};
export const MINIATURE_FOCUS_STORAGE_KEY='fieldwork3d.graphics.miniature-focus';
/** Shelved MF-1–4 experiment. Historical saved preferences must NOT
 * silently reactivate the costly pass. Only explicit developer URLs
 * ?focusFx=subtle|strong|replay may opt in for future A/B comparisons.
 */
export const MINIATURE_FOCUS_SHELVED=true;
export function requestedMiniatureFocus(value:string|null):MiniatureFocusMode{
 if(value===null)return 'off';
 return value==='subtle'||value==='strong'||value==='replay'?value:'off';
}
export function initialMiniatureFocusMode(query:string|null,
 _stored:string|null):MiniatureFocusMode{
 return query===null?'off':requestedMiniatureFocus(query);
}
/** Guard is the *canvas*, not the playable map. Intentional full-frame lens
 * may soften world geometry; 2D controls and overlays are drawn separately.
 */
export function miniatureFocusDecision(input:{
 mode:MiniatureFocusMode;view:MiniatureFocusView;
 quality:FocusQuality;protectedRegionValid:boolean;
 gesturesActive:boolean;capable:boolean;
}):FocusDecision{
 const off=(reason:string):FocusDecision=>({
  active:false,radiusPx:0,strength:0,centerY:.56,
  innerHalfHeight:.14,outerHalfHeight:.34,
  saturation:1,contrast:1,reason
 });
 if(input.mode==='off')return off('setting-off');
 if(input.quality==='performance')return off('performance-preset');
 if(!input.capable)return off('unsupported-gpu');
 if(!input.protectedRegionValid)return off('invalid-frame');
 if(input.view==='floor-plan'||input.view==='top'||input.view==='bodycam')
  return off('view-disabled');
 if(input.mode==='replay'&&input.view==='tactical')return off('replay-only');
 const replay=input.view==='director'||input.view==='free-replay';
 const strong=replay||input.mode==='strong';
 // Camera gestures MUST NOT bypass the effect: doing so made MF-2 pop
 // from a composited frame to a different image on every gesture.
 return {
  active:true,radiusPx:strong?7.1:3.6,
  strength:strong?.86:.62,
  centerY:replay?.54:.56,
  innerHalfHeight:strong?.11:.15,
  outerHalfHeight:strong?.30:.34,
  saturation:strong?1.045:1.02,
  contrast:strong?1.02:1.005,
  reason:strong?'photographic-replay':'photographic-live'
 };
}
