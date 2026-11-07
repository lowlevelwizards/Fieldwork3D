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
 /** Audition the material on all opaque Standard surfaces, incl. firearms. */
 allSurfaces:boolean;
};
export const DEFAULT_STUDIO_LIGHT_LAB:Readonly<StudioLightLabSettings>={
 toon:0,rim:'off',gradient:'current',shadow:'neutral',
 celProfile:'classic',celLow:.66,celHigh:.84,allSurfaces:true
};
function clampCutoff(value:string|null,defaultValue:number):number{
 const n=Number(value);
 return value!==null&&Number.isFinite(n)?
  Math.max(.3,Math.min(.95,Math.round(n*100)/100)):defaultValue;
}
export function studioLightLabFromQuery(search:string):StudioLightLabSettings{
 const p=new URLSearchParams(search);
 const rawProfile=p.get('operatorCelProfile');
 const celProfile:StudioCelProfile=rawProfile==='soft'||rawProfile==='hard'||
  rawProfile==='graphic'?rawProfile:'classic';
 return {toon:requestedOperatorToonBands(search),
  rim:requestedOperatorRimMode(search),
  gradient:requestedOperatorGradient(search),
  shadow:requestedStudioShadowColor(search),
  celProfile,
  celLow:clampCutoff(p.get('operatorCelLow'),DEFAULT_STUDIO_LIGHT_LAB.celLow),
  celHigh:clampCutoff(p.get('operatorCelHigh'),DEFAULT_STUDIO_LIGHT_LAB.celHigh),
  allSurfaces:p.get('operatorAllSurfaces')!=='0'};
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
