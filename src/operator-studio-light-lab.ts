/** R7.8 live Studio-only art comparison settings.
 * Transient, never written to wardrobe, roster, campaign or equipment saves.
 * All query flags remain supported as launch presets for existing QA links.
 */
import {requestedOperatorToonBands,requestedOperatorRimMode,
 type OperatorToonBands,type OperatorRimMode} from './operator-studio-toon-lighting.ts';
import {requestedOperatorGradient,type OperatorHeightProfile}
 from './operator-height-lighting.ts';
import {requestedStudioShadowColor,type StudioShadowColor}
 from './operator-studio-lighting.ts';

export type StudioLightLabSettings={
 toon:OperatorToonBands;rim:OperatorRimMode;
 gradient:OperatorHeightProfile;shadow:StudioShadowColor;
};
export const DEFAULT_STUDIO_LIGHT_LAB:Readonly<StudioLightLabSettings>={
 toon:0,rim:'off',gradient:'current',shadow:'neutral'
};
export function studioLightLabFromQuery(search:string):StudioLightLabSettings{
 return {toon:requestedOperatorToonBands(search),
  rim:requestedOperatorRimMode(search),
  gradient:requestedOperatorGradient(search),
  shadow:requestedStudioShadowColor(search)};
}
export function effectiveStudioLightLab(
 settings:StudioLightLabSettings,original=false
):StudioLightLabSettings{
 // Compare affects presentation only. The stored audition selections survive.
 if(original)return {...DEFAULT_STUDIO_LIGHT_LAB};
 return {...settings,rim:settings.toon===0?'off':settings.rim};
}
export function studioLightLabLabel(settings:StudioLightLabSettings):string{
 return settings.toon===0&&settings.gradient==='current'&&
  settings.shadow==='neutral'?'ORIGINAL':
  [settings.toon===0?'SMOOTH':settings.toon+'-BAND CEL',
   settings.toon===0||settings.rim==='off'?'NO RIM':settings.rim.toUpperCase()+' RIM',
   settings.gradient.toUpperCase()+' HEIGHT',
   settings.shadow.toUpperCase()+' SHADOW FILL'].join(' · ');
}
