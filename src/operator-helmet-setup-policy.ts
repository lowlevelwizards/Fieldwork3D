/** Active helmet cover preferences only.
 * The consolidated ACH/MICH cuts and PASGT use one fitted cover style;
 * field modules live solely in operator-helmet-field-policy.
 */
export const HELMET_COVER_OPTIONS=['none','fitted'] as const;
export type HelmetSetupV1={
 version:1;cover:typeof HELMET_COVER_OPTIONS[number];
};
export const HELMET_SETUP_DEFAULTS:Readonly<HelmetSetupV1>=Object.freeze({
 version:1,cover:'none'
});
export function readHelmetSetup(raw:unknown):HelmetSetupV1{
 const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?
  raw as Record<string,unknown>:{};
 return {version:1,cover:v.cover==='fitted'||v.cover==='loose'?
  'fitted':'none'};
}
export const H1_MODERN_HELMETS=['ach','mich-2001','mich-2002','pasgt'] as const;
export type H1ModernHelmet=typeof H1_MODERN_HELMETS[number];
export const isH1ModernHelmet=(id:string):id is H1ModernHelmet=>
 (H1_MODERN_HELMETS as readonly string[]).includes(id);
export type EffectiveHelmetSetup={setup:HelmetSetupV1;suppressed:readonly string[]};
export function resolveHelmetSetup(shell:string,raw:unknown,context:{
 hasLegacyPrint?:boolean;headset?:string;eyewear?:string;facewear?:string;
}={}):EffectiveHelmetSetup{
 if(!isH1ModernHelmet(shell))return {
  setup:{...HELMET_SETUP_DEFAULTS},suppressed:['unsupported shell']
 };
 const s=readHelmetSetup(raw);
 if(raw===undefined&&context.hasLegacyPrint)s.cover='fitted';
 return {setup:s,suppressed:[]};
}
