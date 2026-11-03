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

/** Single source for the authored panel depth. Front and back bags must
 * clear by their entire thickness, not merely put an outside face beyond
 * the garment. Adaptive model recipes import these same values.
 */
export const ARMOR_PANEL_DEPTHS:Readonly<Record<string,number>>={
 'armor-bare':0,'soft-slick':.38,'soft-paca':.38,
 'soft-vest':1.12,'soft-flak':1.40,
 'plate-slick':1.02,'plate-jpc':1.18,'plate-standard':1.45,
 'plate-heavy':1.77,'plate-legacy':1.70
};
export type ArmorFitSurfaces={
 top:string;style:string;
 front:number;back:number;side:number;
 shoulderY:number;shoulderZ:number;
 frontBagBottom:number;standOff:number;
};
/** Local, compressed outer garment surface beneath protective equipment.
 * Front pockets are pressed flat by the vest rather than increasing the
 * entire vest stand-off. Other uncovered garment details stay unchanged.
 * The torso loft is always the authoritative underlying cloth envelope.
 */
export type ArmorContactSurface={
 y:number;front:number;back:number;side:number;
};
export function armorContactSurface(top:string,y:number):ArmorContactSurface{
 const ring=uniformFitEnvelope(top).outer(y);
 return {y:ring.y,front:ring.front,back:ring.back,side:ring.side};
}
/** Contact at only the heights the fitted part actually occupies; it avoids
 * using the widest shoulder or waist to displace the entire armor.
 */
export function armorContactSpan(top:string,low:number,high:number){
 const sample=[low,(low+high)*.5,high].map(y=>armorContactSurface(top,y));
 return {
  front:Math.max(...sample.map(x=>x.front)),
  back:Math.min(...sample.map(x=>x.back)),
  side:Math.max(...sample.map(x=>x.side))
 };
}
/** The bag is an authored *size* but its position follows the outer shirt.
 * Outer fabric shapes must be outside of uniform face + clearance.
 * Concealed armor remains underneath the uniform and is not translated.
 */
export function fittedArmorSurfaces(style:string,top:string,
 baseline:{front:number;side:number}):ArmorFitSurfaces{
 const uniform=uniformFitEnvelope(top);
 const isConcealed=style==='soft-slick'||style==='soft-paca';
 const thickness=ARMOR_PANEL_DEPTHS[style]??0;
 // Body panels cover the upper sternum down to the lower ribs. Pockets
 // underneath can be compressed, so never add global pocket overhang.
 const chest=armorContactSpan(top,-3.8,4.0);
 const clearance=.13;
 const front=isConcealed?baseline.front:Math.max(
  baseline.front,chest.front+thickness+clearance);
 const rearBaseline=baseline.front-(style==='plate-heavy'?.30:0);
 const back=isConcealed?-baseline.front:-Math.max(
  rearBaseline,-chest.back+thickness+clearance);
 // Distinct fit tiers describe outboard material thickness and/or plates,
 // NOT huge arbitrary margins that leave air between fabric and vest.
 const sideAllowance=style==='plate-slick'?.29:
  style==='plate-jpc'?.37:
  style==='plate-standard'?.53:
  style==='plate-heavy'?.68:
  style==='plate-legacy'?.60:
  style==='soft-flak'?.50:style==='soft-vest'?.43:.29;
 const sideCloth=armorContactSpan(top,-3.0,1.0).side;
 const side=isConcealed?baseline.side:Math.max(
  baseline.side,sideCloth+sideAllowance);
 // Crown is the midpoint of broad webbing sitting directly on cloth.
 // The same height is shared with the mounted rig and fit diagnostics.
 const shoulderY=uniform.shoulderCrown+
  uniform.shoulderOverhang+.50;
 return {style,top:uniform.top,front,back,side,shoulderY,
  shoulderZ:(top==='smock-jacket'||top==='gorka-jacket')?
   5.78:Math.min(5.1,Math.max(3.15,uniform.outer(5.0).side-3.0)),
  frontBagBottom:style==='plate-slick'?-3.45:-4.35,
  standOff:clearance};
}
