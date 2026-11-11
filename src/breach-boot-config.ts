/** One immutable tactical-entry startup snapshot.
 * Parsing is pure: standalone Labs and render-specific QA keep their own
 * entrypoints, and no browser globals are touched when this module imports.
 * A2 does not own mutable mission preferences or application navigation.
 */
import type {SiteScale} from './breach-site.ts';
import type {LightingMode} from './equipment-site-lighting.ts';

export const BREACH_LIGHTING_MODES:readonly LightingMode[]=[
 'day','evening','night','blackout','emergency'
];
export const BREACH_SITE_SCALES:readonly SiteScale[]=[
 'standard','expanded','small','medium','large'
];

export type BreachBootConfig=Readonly<{
 briefingPreviewEnabled:boolean;
 civilianPreview:boolean;
 legacyStudy:boolean;
 quickEntry:boolean;
 requestedSeed:number|null;
 requestedCondition:number|null;
 lighting:LightingMode;
 scale:SiteScale;
 replayDirectorDiagnostics:boolean;
 navDiagnostics:boolean;
 auditRouteMode:boolean;
 fogDebugPalette:boolean;
 bodycamQa:boolean;
 perfOverlay:boolean;
 awareness:string|null;
 gpuWarmupEnabled:boolean;
 focusFx:string|null;
}>;

/** Keep the historical Number() semantics: an explicit blank condition is 0,
 * while a blank/zero/unsafe/random seed is never a valid scenario seed.
 */
export function parseBreachBootConfig(query:string|URLSearchParams):BreachBootConfig{
 const params=new URLSearchParams(query);
 const rawSeed=Number(params.get('seed'));
 const requestedSeed=params.has('seed')&&Number.isSafeInteger(rawSeed)&&
  rawSeed>0&&rawSeed<=0xffffffff?rawSeed:null;
 const rawCondition=params.get('condition');
 const conditionNumber=Number(rawCondition);
 const requestedCondition=rawCondition!==null&&
  Number.isFinite(conditionNumber)?
  Math.max(0,Math.min(100,conditionNumber)):null;
 const rawLighting=params.get('lighting');
 const rawScale=params.get('scale');
 return Object.freeze({
  briefingPreviewEnabled:params.get('briefingV2')!=='0',
  civilianPreview:params.get('civilians')!=='0',
  legacyStudy:params.has('fixedSite'),
  quickEntry:params.has('quick'),
  requestedSeed,requestedCondition,
  lighting:BREACH_LIGHTING_MODES.find(mode=>mode===rawLighting)??'day',
  scale:BREACH_SITE_SCALES.find(scale=>scale===rawScale)??'standard',
  replayDirectorDiagnostics:params.has('directorDebug'),
  navDiagnostics:params.has('nav'),
  auditRouteMode:params.has('audit'),
  fogDebugPalette:params.get('fogDebug')==='palette',
  bodycamQa:params.has('bodycamqa'),
  perfOverlay:params.has('perf'),
  awareness:params.get('awareness'),
  gpuWarmupEnabled:params.get('gpuWarmup')!=='0',
  focusFx:params.get('focusFx')
 });
}
