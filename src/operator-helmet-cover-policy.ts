/** R5E detachable M1 helmet textile system. Helmet and cover are independent:
 * no camouflage alters steel plating, protection or inventory, and no cloth is
 * generated for incompatible helmet families.
 */
import {isHeadwearCamoId,type HeadwearCamoId} from './operator-headwear-camo.ts';
export const HELMET_COVER_STYLES=['none','fitted','loose'] as const;
export const HELMET_BANDS=['none','cloth','elastic'] as const;
export const HELMET_NET_STYLES=['none','coarse'] as const;
export const HELMET_SCRIM_STYLES=['none','sparse','field'] as const;
export type HelmetCoverStyle=typeof HELMET_COVER_STYLES[number];
export type HelmetBandStyle=typeof HELMET_BANDS[number];
export type HelmetNetStyle=typeof HELMET_NET_STYLES[number];
export type HelmetScrimStyle=typeof HELMET_SCRIM_STYLES[number];
export type HelmetCoverConfig={
 helmetCover?:HelmetCoverStyle;
 helmetCoverCamo?:HeadwearCamoId;
 helmetBand?:HelmetBandStyle;
 helmetNet?:HelmetNetStyle;
 helmetScrim?:HelmetScrimStyle;
};
/** Deliberately small: periods need individual reference recipes. Avoid
 * treating an existing camo master as proof it was issued on every helmet.
 */
export const HELMET_COVER_PRINTS={
 'm1-steel':['mitchell-leaf','m81-woodland','six-color-desert',
  'three-color-desert']
} as const satisfies Record<string,readonly HeadwearCamoId[]>;
export const helmetCoverChoices=(headwear:string):readonly HeadwearCamoId[] =>
 headwear==='m1-steel'?HELMET_COVER_PRINTS['m1-steel']:[];
export function readHelmetCoverConfig(raw:unknown):HelmetCoverConfig{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const x=raw as Partial<HelmetCoverConfig>,result:HelmetCoverConfig={};
 if(x.helmetCover&&HELMET_COVER_STYLES.includes(x.helmetCover))
  result.helmetCover=x.helmetCover;
 if(isHeadwearCamoId(x.helmetCoverCamo))result.helmetCoverCamo=x.helmetCoverCamo;
 if(x.helmetBand&&HELMET_BANDS.includes(x.helmetBand))result.helmetBand=x.helmetBand;
 if(x.helmetNet&&HELMET_NET_STYLES.includes(x.helmetNet))result.helmetNet=x.helmetNet;
 if(x.helmetScrim&&HELMET_SCRIM_STYLES.includes(x.helmetScrim))
  result.helmetScrim=x.helmetScrim;
 return result;
}
export function resolvedHelmetCoverConfig(headwear:string,
 raw:HelmetCoverConfig|undefined):HelmetCoverConfig{
 if(headwear!=='m1-steel')return {};
 const r=readHelmetCoverConfig(raw);
 return {
  helmetCover:r.helmetCover??'none',
  helmetCoverCamo:r.helmetCoverCamo&&helmetCoverChoices(headwear).includes(r.helmetCoverCamo)?
   r.helmetCoverCamo:undefined,
  helmetBand:r.helmetBand??'none',
  helmetNet:r.helmetNet??'none',
  helmetScrim:r.helmetScrim??'none'
 };
}
