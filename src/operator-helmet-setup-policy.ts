/** H1 — cosmetic helmet setup contract. Equipment items and protection stay authoritative. */
export const HELMET_COVER_OPTIONS=['none','fitted','loose'] as const;
export const HELMET_RAIL_OPTIONS=['none','arc','powerpath'] as const;
export const HELMET_SHROUD_OPTIONS=['none','legacy','skeleton','integrated'] as const;
export const HELMET_NVG_OPTIONS=['none','mono-stowed','dual-stowed','dual-lowered'] as const;
export const HELMET_SCRIM_OPTIONS=['none','net','sparse','field'] as const;
export const HELMET_RETENTION_OPTIONS=['four-point','h-nape','dial'] as const;
export const HELMET_HEADSET_MOUNT_OPTIONS=['auto','headband','rail'] as const;
export const HELMET_REAR_OPTIONS=['none','counterweight','battery'] as const;
export const HELMET_LIGHT_OPTIONS=['none','left','right'] as const;
export type HelmetSetupV1={
 version:1;presetOrigin?:string;
 cover:typeof HELMET_COVER_OPTIONS[number];band:'none'|'elastic';
 scrim:typeof HELMET_SCRIM_OPTIONS[number];
 retention:typeof HELMET_RETENTION_OPTIONS[number];
 shroud:typeof HELMET_SHROUD_OPTIONS[number];
 rails:typeof HELMET_RAIL_OPTIONS[number];
 nvg:typeof HELMET_NVG_OPTIONS[number];
 headsetMount:typeof HELMET_HEADSET_MOUNT_OPTIONS[number];
 rearModule:typeof HELMET_REAR_OPTIONS[number];
 light:typeof HELMET_LIGHT_OPTIONS[number];rearStrobe:boolean;
};
export const HELMET_SETUP_DEFAULTS:Readonly<HelmetSetupV1>=Object.freeze({
 version:1,cover:'none',band:'none',scrim:'none',retention:'four-point',
 shroud:'none',rails:'none',nvg:'none',headsetMount:'auto',
 rearModule:'none',light:'none',rearStrobe:false
});
const choose=<T extends string>(value:unknown,values:readonly T[],fallback:T):T=>
 typeof value==='string'&&values.includes(value as T)?value as T:fallback;
export function readHelmetSetup(value:unknown):HelmetSetupV1{
 const v=value&&typeof value==='object'&&!Array.isArray(value)?
  value as Partial<HelmetSetupV1>:{};
 const d=HELMET_SETUP_DEFAULTS;
 return {
  version:1,
  ...(typeof v.presetOrigin==='string'&&v.presetOrigin.length<81?
   {presetOrigin:v.presetOrigin}:{}),
  cover:choose(v.cover,HELMET_COVER_OPTIONS,d.cover),
  band:choose(v.band,['none','elastic'] as const,d.band),
  scrim:choose(v.scrim,HELMET_SCRIM_OPTIONS,d.scrim),
  retention:choose(v.retention,HELMET_RETENTION_OPTIONS,d.retention),
  shroud:choose(v.shroud,HELMET_SHROUD_OPTIONS,d.shroud),
  rails:choose(v.rails,HELMET_RAIL_OPTIONS,d.rails),
  nvg:choose(v.nvg,HELMET_NVG_OPTIONS,d.nvg),
  headsetMount:choose(v.headsetMount,HELMET_HEADSET_MOUNT_OPTIONS,d.headsetMount),
  rearModule:choose(v.rearModule,HELMET_REAR_OPTIONS,d.rearModule),
  light:choose(v.light,HELMET_LIGHT_OPTIONS,d.light),
  rearStrobe:v.rearStrobe===true
 };
}
export const H1_MODERN_HELMETS=[
 'ach','pasgt','high-cut','mich-2001','mich-2002','fast-sf','fast-xp-mid'
] as const;
export type H1ModernHelmet=typeof H1_MODERN_HELMETS[number];
export const isH1ModernHelmet=(id:string):id is H1ModernHelmet=>
 (H1_MODERN_HELMETS as readonly string[]).includes(id);
type Capabilities={rails:HelmetSetupV1['rails'];shrouds:readonly HelmetSetupV1['shroud'][]};
export const HELMET_CAPABILITIES:Readonly<Record<H1ModernHelmet,Capabilities>>={
 ach:{rails:'none',shrouds:['none','legacy','skeleton']},
 pasgt:{rails:'none',shrouds:['none']},
 'high-cut':{rails:'arc',shrouds:['none','skeleton','integrated']},
 'mich-2001':{rails:'none',shrouds:['none','legacy','skeleton']},
 'mich-2002':{rails:'none',shrouds:['none','legacy','skeleton']},
 'fast-sf':{rails:'arc',shrouds:['none','skeleton','integrated']},
 'fast-xp-mid':{rails:'powerpath',shrouds:['none','skeleton','integrated']}
};
export type EffectiveHelmetSetup={setup:HelmetSetupV1;suppressed:readonly string[]};
export function resolveHelmetSetup(shell:string,raw:unknown,context:{
 hasLegacyPrint?:boolean;headset?:string;eyewear?:string;facewear?:string;
}={}):EffectiveHelmetSetup{
 const s={...readHelmetSetup(raw)},suppressed:string[]=[];
 if(!isH1ModernHelmet(shell))return {
  setup:{...HELMET_SETUP_DEFAULTS},suppressed:['unsupported shell']
 };
 const cap=HELMET_CAPABILITIES[shell];
 // Printed old shells implicitly gain fitted cloth until explicitly overridden.
 if(raw===undefined&&context.hasLegacyPrint)s.cover='fitted';
 // PASGT is a period full-coverage shell, not a modern tactical hardware
 // platform. Sanitize old H1 setup values while retaining stored preferences.
 if(shell==='pasgt'){
  if(s.cover==='loose')s.cover='fitted';
  s.rails='none';s.shroud='none';s.nvg='none';
  s.headsetMount='auto';s.rearModule='none';s.light='none';
  s.rearStrobe=false;s.band='none';s.scrim='none';
  s.retention='four-point';
  return {setup:s,suppressed};
 }
 if(s.cover==='loose'&&['high-cut','fast-sf','fast-xp-mid'].includes(shell)){
  s.cover='fitted';suppressed.push('loose cover obscures hardware');
 }
 if(s.rails!==cap.rails&&s.rails!=='none'){
  s.rails='none';suppressed.push('rail incompatible with shell');
 }
 if(!cap.shrouds.includes(s.shroud)){
  s.shroud='none';suppressed.push('shroud incompatible with shell');
 }
 if(s.nvg!=='none'&&s.shroud==='none'){
  s.nvg='none';suppressed.push('night-vision model requires shroud');
 }
 if(s.headsetMount==='rail'&&s.rails==='none'){
  s.headsetMount='headband';suppressed.push('headset needs rails');
 }
 if(s.headsetMount==='rail'&&context.headset!==undefined&&
   ['comms-none','earpiece'].includes(context.headset)){
  s.headsetMount='auto';suppressed.push('no rail-compatible headset equipped');
 }
 if(s.light!=='none'&&s.rails==='none'){
  s.light='none';suppressed.push('task light needs rails');
 }
 if(s.nvg==='dual-lowered'&&
   (context.facewear==='gas-gp5'||context.eyewear==='goggles-field')){
  s.nvg='dual-stowed';suppressed.push('lowered optics conflict with face equipment');
 }
 return {setup:s,suppressed};
}
