/** Deterministic outer-surface measurements for armor fitting.
 * Every value is in the existing chest group frame: +X front, +/-Z sides,
 * +Y up. Base ring dimensions come DIRECTLY from the garment authors.
 * Only sewn-on pockets, hood/collar and shoulder caps need explicit margins.
 * No raycast, physics, or per-frame shape sampling.
 */
import {BLOUSE_CUT_PROFILE} from './operator-field-blouse-prototypes.ts';
import {UPPER_CUT_PROFILES} from './operator-new-upper-garments.ts';

export type FitRing={y:number;front:number;back:number;side:number};
export type UniformFitEnvelope={
 top:string;
 rings:readonly FitRing[];
 shoulderCrown:number;
 frontOverhang:number;
 shoulderOverhang:number;
 neckGuard:number;
 outer:(y:number)=>FitRing;
};
type Profile={rings:readonly FitRing[]};
const BLOUSES:BareProfiles=BLOUSE_CUT_PROFILE;
const NEW_TOPS:BareProfiles=UPPER_CUT_PROFILES;
type BareProfiles=Record<string,Profile>;
const BASE=NEW_TOPS['combat-shirt'].rings;
/** Existing visible garment details extend beyond the simplified loft rings.
 * Front overhang includes pockets/flaps (BDU chest ~6.47, ACU ~6.44,
 * smock ~6.59, Gorka waist ~6.78), rather than assuming a bare torso.
 * Smock/Gorka hood clearance is needed only at the neck, not shoulders.
 */
const CUT_DETAILS:Readonly<Record<string,{
 crown:number;frontOverhang:number;shoulderOverhang:number;neckGuard:number}>>={
 'combat-shirt':{crown:6.56,frontOverhang:.14,shoulderOverhang:.12,neckGuard:.25},
 'bdu-shirt':{crown:7.36,frontOverhang:.72,shoulderOverhang:.13,neckGuard:.35},
 'acu-shirt':{crown:7.43,frontOverhang:.76,shoulderOverhang:.12,neckGuard:.48},
 'smock-jacket':{crown:6.73,frontOverhang:.83,shoulderOverhang:.18,neckGuard:2.05},
 'gorka-jacket':{crown:6.94,frontOverhang:.70,shoulderOverhang:.20,neckGuard:2.30}
};
const clamp=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
const fitCache=new Map<string,UniformFitEnvelope>();
export function uniformFitEnvelope(top:string):UniformFitEnvelope{
 const name=top in CUT_DETAILS?top:'combat-shirt';
 const previous=fitCache.get(name);if(previous)return previous;
 const src=(BLOUSES[name]??NEW_TOPS[name])?.rings??BASE;
 const rings=[...src].sort((a,b)=>a.y-b.y).map(r=>({...r}));
 const props=CUT_DETAILS[name];
 const outer=(y:number):FitRing=>{
  const yy=clamp(y,rings[0].y,rings[rings.length-1].y);
  for(let i=0;i<rings.length-1;i++){
   const a=rings[i],b=rings[i+1];
   if(yy>b.y)continue;
   const t=(yy-a.y)/Math.max(.0001,b.y-a.y);
   return {y:yy,front:a.front+(b.front-a.front)*t,
    back:a.back+(b.back-a.back)*t,
    side:a.side+(b.side-a.side)*t};
  }
  return {...rings[rings.length-1],y:yy};
 };
 const envelope:UniformFitEnvelope={
  top:name,rings,shoulderCrown:props.crown,
  frontOverhang:props.frontOverhang,
  shoulderOverhang:props.shoulderOverhang,
  neckGuard:props.neckGuard,outer
 };
 fitCache.set(name,envelope);return envelope;
}
export const ARMOR_FIT_TOPS=[
 'combat-shirt','bdu-shirt','acu-shirt','smock-jacket','gorka-jacket'
] as const;

export type ArmorFitSurfaces={
 top:string;style:string;
 front:number;back:number;side:number;
 shoulderY:number;shoulderZ:number;
 frontBagBottom:number;standOff:number;
};
/** The bag is an authored *size* but its position follows the outer shirt.
 * Outer fabric shapes must be outside of uniform face + clearance.
 * Concealed armor remains underneath the uniform and is not translated.
 */
export function fittedArmorSurfaces(style:string,top:string,
 baseline:{front:number;side:number}):ArmorFitSurfaces{
 const uniform=uniformFitEnvelope(top);
 const chest=uniform.outer(.10),lower=uniform.outer(-3.0),
  upper=uniform.outer(3.6);
 const isConcealed=style==='soft-slick'||style==='soft-paca';
 const standOff=style==='soft-vest'||style==='soft-flak'?.20:
  style==='plate-heavy'||style==='plate-legacy'?.30:.24;
 const faceClear= Math.max(chest.front,lower.front,upper.front)+
  uniform.frontOverhang+standOff;
 const rearClear=-Math.min(chest.back,lower.back,upper.back)+standOff;
 const front=isConcealed?baseline.front:Math.max(
  baseline.front,faceClear);
 const back=isConcealed?-baseline.front:-Math.max(
  baseline.front,rearClear);
 const side=isConcealed?baseline.side:Math.max(
  baseline.side,Math.max(chest.side,lower.side)+.35);
 const shoulderY=uniform.shoulderCrown+.46+uniform.shoulderOverhang;
 return {style,top:uniform.top,front,back,side,shoulderY,
  shoulderZ:Math.min(5.1,Math.max(3.15,uniform.outer(5.0).side-3.0)),
  frontBagBottom:style==='plate-slick'?-3.45:-4.35,
  standOff};
}
