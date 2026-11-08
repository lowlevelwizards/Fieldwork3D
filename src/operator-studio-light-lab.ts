/** R7.18 shared art-look settings for Studio, Arsenal and tactical scenes.
 * Studio controls remain temporary; approved values are presentation-only.
 * Nothing here is persisted
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
 /** Glint footprint width relative to the current geometric strip. */
 rimWidth:number;
 /** Portion of a single edge visible as a moving glint (0.1–0.8). */
 rimCoverage:number;
 /** Relaxation of the light-facing/slant gate for the localized hard glint. */
 rimAngleLooseness:number;
 /** R7.17 softer, cream-colored glints on the BRIGHTEST front-lit mesh edges.
  * These use the weapon glint mask, never back-facing silhouette lighting. */
 rimFabricWidth:number;
 rimFabricOpacity:number;
 rimFabricLightThreshold:number;
 rimSkinWidth:number;
 rimSkinOpacity:number;
 rimSkinLightThreshold:number;
 rimSkinWarmth:number;
 /** Debug the exact highlight mask rather than recoloring the surface. */
 rimDebugMask:boolean;
 /** Studio-only horizontal light orbit, degrees from the approved key. */
 lightAzimuth:number;
 /** Audition the material on all opaque Standard surfaces, incl. firearms. */
 allSurfaces:boolean;
};
export const DEFAULT_STUDIO_LIGHT_LAB:Readonly<StudioLightLabSettings>={
 toon:0,rim:'off',gradient:'current',shadow:'neutral',
 celProfile:'graphic',celLow:.70,celHigh:.84,rimAmount:.85,
 rimWidth:2.5,rimCoverage:.55,rimAngleLooseness:1.25,
 rimFabricWidth:2.8,rimFabricOpacity:0,rimFabricLightThreshold:.65,
 rimSkinWidth:2.6,rimSkinOpacity:0,rimSkinLightThreshold:.65,rimSkinWarmth:1.0,
 rimDebugMask:false,lightAzimuth:0,allSurfaces:true
};
/** Approved R7.18 graphic look; experiment A/B still restores the above
 * original. The same numeric profile drives all three 3D viewers.
 * Fabric and skin edge inks stay rejected and completely disabled.
 */
export const APPROVED_GRAPHIC_LIGHTING:Readonly<StudioLightLabSettings>={
 ...DEFAULT_STUDIO_LIGHT_LAB,
 toon:3,rim:'dual',gradient:'piece-rose',shadow:'plum-plus',
 celProfile:'graphic',celLow:.60,celHigh:.86,
 rimAmount:.42,rimWidth:2.0,rimCoverage:.40,
 rimFabricOpacity:0,rimSkinOpacity:0
};
/** Avoid optional URL or UI settings accidentally reactivating rejected
 * fabric/skin glints. This restriction applies in gameplay as well. */
export function approvedGraphicLighting():StudioLightLabSettings{
 return {...APPROVED_GRAPHIC_LIGHTING};
}
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
 const n=amount===null ? DEFAULT_STUDIO_LIGHT_LAB.rimAmount : Number(amount);
 if(!['operatorLightingToon','operatorRim','operatorGradient',
    'operatorShadowColor','operatorRimAmount','operatorCelLow']
  .some(k=>p.has(k)))return approvedGraphicLighting();
 return {
  toon,
  rim:rim==='off'?'off':'dual',
  gradient:gradient==='current'?'current':
   gradient==='piece-rose'?'piece-rose':'piece',
  shadow:shadow==='neutral'?'neutral':'plum-plus',
  celProfile:'graphic',
  celLow:clampCutoff(p.get('operatorCelLow'),.70),
  celHigh:.84,
  rimAmount:Number.isFinite(n)?Math.max(0,Math.min(1,n)):
   DEFAULT_STUDIO_LIGHT_LAB.rimAmount,
  rimWidth:DEFAULT_STUDIO_LIGHT_LAB.rimWidth,
  rimCoverage:DEFAULT_STUDIO_LIGHT_LAB.rimCoverage,
  rimAngleLooseness:DEFAULT_STUDIO_LIGHT_LAB.rimAngleLooseness,
  rimFabricWidth:DEFAULT_STUDIO_LIGHT_LAB.rimFabricWidth,
  rimFabricOpacity:DEFAULT_STUDIO_LIGHT_LAB.rimFabricOpacity,
  rimFabricLightThreshold:DEFAULT_STUDIO_LIGHT_LAB.rimFabricLightThreshold,
  rimSkinWidth:DEFAULT_STUDIO_LIGHT_LAB.rimSkinWidth,
  rimSkinOpacity:DEFAULT_STUDIO_LIGHT_LAB.rimSkinOpacity,
  rimSkinLightThreshold:DEFAULT_STUDIO_LIGHT_LAB.rimSkinLightThreshold,
  rimSkinWarmth:DEFAULT_STUDIO_LIGHT_LAB.rimSkinWarmth,
  rimDebugMask:false,lightAzimuth:0,
  allSurfaces:true
 };
}
const THREECLAMP=(value:number,min:number,max:number,fallback:number)=>
 Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
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
   Math.max(0,Math.min(1,settings.rimAmount)):.85,
  rimWidth:THREECLAMP(settings.rimWidth,1,4,2.5),
  rimCoverage:THREECLAMP(settings.rimCoverage,.10,.80,.55),
  rimAngleLooseness:THREECLAMP(settings.rimAngleLooseness,.75,2,1.25),
  rimFabricWidth:THREECLAMP(settings.rimFabricWidth,1,4,2.8),
  rimFabricOpacity:0,
  rimFabricLightThreshold:THREECLAMP(settings.rimFabricLightThreshold,0,1,.65),
  rimSkinWidth:THREECLAMP(settings.rimSkinWidth,1,4,2.6),
  rimSkinOpacity:0,
  rimSkinLightThreshold:THREECLAMP(settings.rimSkinLightThreshold,0,1,.65),
  rimSkinWarmth:THREECLAMP(settings.rimSkinWarmth,.5,1.5,1),
  rimDebugMask:settings.rimDebugMask===true,
  lightAzimuth:THREECLAMP(settings.lightAzimuth,-180,180,0),
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
