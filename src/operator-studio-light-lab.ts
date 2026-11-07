/** R7.9 interactive Studio-only visual auditions. Nothing here is persisted
 * to operator wardrobe, campaign inventory, combat simulation or replay.
 * Retain the original R7 URL flags as initial presets.
 */
import {requestedOperatorToonBands,requestedOperatorRimMode,
 type OperatorToonBands,type OperatorRimMode} from './operator-studio-toon-lighting.ts';
import {requestedOperatorGradient,type OperatorHeightProfile}
 from './operator-height-lighting.ts';
import {requestedStudioShadowColor,type StudioShadowColor}
 from './operator-studio-lighting.ts';

export type StudioCelProfile='classic'|'soft'|'hard'|'graphic';
export type StudioLightLabSettings={
 toon:OperatorToonBands;rim:OperatorRimMode;
 gradient:OperatorHeightProfile;shadow:StudioShadowColor;
 celProfile:StudioCelProfile;celLow:number;celHigh:number;
 /** 0–1 blend toward near-white on genuinely lit grazing surfaces. */
 rimAmount:number;
 /** Audition the material on all opaque Standard surfaces, incl. firearms. */
 allSurfaces:boolean;
};
export const DEFAULT_STUDIO_LIGHT_LAB:Readonly<StudioLightLabSettings>={
 toon:0,rim:'off',gradient:'current',shadow:'neutral',
 celProfile:'graphic',celLow:.70,celHigh:.84,rimAmount:.80,allSurfaces:true
};
function clampCutoff(value:string|null,defaultValue:number):number{
 const n=Number(value);
 return value!==null&&Number.isFinite(n)?
  Math.max(.3,Math.min(.95,Math.round(n*100)/100)):defaultValue;
}
/** Legacy direct URL experiments map onto the compact available controls.
 * Prevent hidden selections that don't exist in the actual dropdown UI.
 * The original unmodified look stays the default with no query flags.
 */
export function studioLightLabFromQuery(search:string):StudioLightLabSettings{
 const p=new URLSearchParams(search);
 const toon=requestedOperatorToonBands(search);
 const rim=requestedOperatorRimMode(search);
 const gradient=requestedOperatorGradient(search);
 const shadow=requestedStudioShadowColor(search);
 const amount=p.get('operatorRimAmount');
 const n=amount===null ? .80 : Number(amount);
 return {
  toon:toon?2:0,
  rim:rim==='off'?'off':'dual',
  gradient:gradient==='current'?'current':
   gradient==='piece-rose'?'piece-rose':'piece',
  shadow:shadow==='neutral'?'neutral':'plum-plus',
  celProfile:'graphic',
  celLow:clampCutoff(p.get('operatorCelLow'),.70),
  celHigh:.84,
  rimAmount:Number.isFinite(n)?Math.max(0,Math.min(1,n)):.80,
  allSurfaces:true
 };
}
export function effectiveStudioLightLab(
 settings:StudioLightLabSettings,original=false
):StudioLightLabSettings{
 if(original)return {...DEFAULT_STUDIO_LIGHT_LAB};
 const low=Math.max(.3,Math.min(.88,settings.celLow));
 const high=Math.max(low+.06,Math.min(.96,settings.celHigh));
 // Previous selective hard/pixel rims require cel. The new dual graphic
 // lighting is independent, so the smooth model can audition a rim too.
 return {...settings,celLow:low,celHigh:high,
  rimAmount:Number.isFinite(settings.rimAmount)?
   Math.max(0,Math.min(1,settings.rimAmount)):.80,
  rim:settings.toon===0&&settings.rim!=='dual'?'off':settings.rim};
}
export function studioLightLabLabel(s:StudioLightLabSettings):string{
 if(s.toon===0&&s.rim==='off'&&s.gradient==='current'&&
    s.shadow==='neutral')return 'ORIGINAL';
 return [s.toon===0?'SMOOTH':s.toon+'-BAND '+s.celProfile.toUpperCase(),
  s.rim==='off'?'NO RIM':s.rim.toUpperCase()+' RIM',
  s.gradient.toUpperCase()+' HEIGHT',
  s.shadow.toUpperCase()+' FILL'].join(' · ');
}
