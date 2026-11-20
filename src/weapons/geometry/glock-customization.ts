/** Genuine Glock visual build slots. Every option creates a model part,
 * is compatibility-checked and is persisted on the owned secondary.
 * No gameplay optic, light output or ballistic modifier until S6/S7.
 */
export type GlockModelId=
 'glock-g19-gen3'|'glock-g26'|'glock-g19x'|'glock-g19-gen5-mos';
export type GlockCustomization=Readonly<{
 finish:'factory'|'black'|'coyote';
 optic:'none'|'micro';
 light:'none'|'compact';
}>;
export const defaultGlockCustomization=():GlockCustomization=>({
 finish:'factory',optic:'none',light:'none'
});
export const glockHasOpticMount=(model:GlockModelId)=>
 model==='glock-g19-gen5-mos';
export const glockHasAccessoryRail=(model:GlockModelId)=>
 model!=='glock-g26';
/** Strict boundary; null signifies an illegal or unsupported build. */
export function readGlockCustomization(model:GlockModelId,raw:unknown):
 GlockCustomization|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const o=raw as Record<string,unknown>;
 if(!['factory','black','coyote'].includes(o.finish as string)||
 !['none','micro'].includes(o.optic as string)||
 !['none','compact'].includes(o.light as string)||
 (o.optic==='micro'&&!glockHasOpticMount(model))||
 (o.light==='compact'&&!glockHasAccessoryRail(model)))return null;
 return {finish:o.finish as GlockCustomization['finish'],
  optic:o.optic as GlockCustomization['optic'],
  light:o.light as GlockCustomization['light']};
}
export function normalizeGlockCustomization(model:GlockModelId,raw:unknown):
 GlockCustomization{
 const o=raw as Partial<GlockCustomization>|null;
 if(!o)return defaultGlockCustomization();
 // On a model swap, preserve compatible installed hardware and the chosen
 // finish while removing ONLY components that physically cannot be mounted.
 const finish=['factory','black','coyote'].includes(o.finish??'')?
  o.finish!: 'factory';
 return {finish,
  optic:o.optic==='micro'&&glockHasOpticMount(model)?'micro':'none',
  light:o.light==='compact'&&glockHasAccessoryRail(model)?'compact':'none'};
}
export const glockAccessoryMassKg=(build:GlockCustomization)=>(
 (build.optic==='micro'?.045:0)+(build.light==='compact'?.105:0)
);
