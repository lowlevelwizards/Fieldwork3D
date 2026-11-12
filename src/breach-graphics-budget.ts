import {DEFAULT_SHADOW_MAP_SIZE} from './rendering/shadow-map-budget.ts';
/** Contained mobile presentation budgets. Locomotion/IK are untouched. */
export type GraphicsPreset='performance'|'balanced'|'quality';
export function graphicsBudget(setting:string|null,touch:boolean){
 const mode:GraphicsPreset=setting==='performance'?'performance':
   setting==='quality'?'quality':'balanced';
 return {mode,pixelRatio:mode==='performance'?1:
   mode==='quality'?1.45:touch?1.25:1.45,
   // Quality presets still independently control render pixel ratio;
   // the miniature world does not benefit from bigger GPU shadow maps.
   shadowSize:DEFAULT_SHADOW_MAP_SIZE};
}
