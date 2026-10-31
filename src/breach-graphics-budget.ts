/** Contained mobile presentation budgets. Locomotion/IK are untouched. */
export type GraphicsPreset='performance'|'balanced'|'quality';
export function graphicsBudget(setting:string|null,touch:boolean){
 const mode:GraphicsPreset=setting==='performance'?'performance':
   setting==='quality'?'quality':'balanced';
 return {mode,pixelRatio:mode==='performance'?1:
   mode==='quality'?1.45:touch?1.25:1.45,
   shadowSize:mode==='performance'?512:mode==='quality'?1024:768};
}
