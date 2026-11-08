/** MF-1: presentation-only miniature optics. Never consult simulation/intel. */
export type MiniatureFocusMode='off'|'subtle'|'replay';
export type MiniatureFocusView='tactical'|'top'|'floor-plan'|
  'director'|'free-replay'|'bodycam';
export type FocusQuality='performance'|'balanced'|'quality';
export type FocusDecision={
  active:boolean;radiusPx:number;strength:number;reason:string;
};
export function requestedMiniatureFocus(value:string|null):MiniatureFocusMode{
  return value==='subtle'||value==='replay'?value:'off';
}
export function miniatureFocusDecision(input:{
  mode:MiniatureFocusMode;view:MiniatureFocusView;
  quality:FocusQuality;protectedRegionValid:boolean;
  gesturesActive:boolean;capable:boolean;
}):FocusDecision{
  const off=(reason:string):FocusDecision=>({active:false,radiusPx:0,strength:0,reason});
  if(input.mode==='off')return off('setting-off');
  if(input.quality==='performance')return off('performance-preset');
  if(!input.capable)return off('unsupported-gpu');
  if(!input.protectedRegionValid)return off('unprotected-view');
  if(input.view==='floor-plan'||input.view==='top'||input.view==='bodycam')
    return off('view-disabled');
  if(input.mode==='replay'&&input.view==='tactical')return off('replay-only');
  if(input.gesturesActive)return off('active-gesture');
  const director=input.view==='director';
  return {active:true,radiusPx:director?2:1.25,
    strength:director?.30:.15,reason:director?'director':'peripheral'};
}
