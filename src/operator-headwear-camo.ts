/** Phase 3A: authored 1:1 camouflage motifs for approved Fieldwork headgear.
 * Five 32px seamless canonical tiles. Each polygon is hand placed, with no
 * RNG/noise pixels or filtering. Palette colors are art-directed adaptations
 * of reference fabric, not claims of measured military color standards.
 */
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
export const HEADWEAR_CAMO_SIZE=32;
export const HEADWEAR_CAMO_IDS=[
 'm81-woodland','three-color-desert','tiger-stripe','ucp','multicam'
] as const;
export type HeadwearCamoId=typeof HEADWEAR_CAMO_IDS[number];
type RGB=readonly [number,number,number];
type Motif=readonly [number,readonly number[]];
type CamoRecipe={
 label:string;description:string;
 colors:readonly RGB[];targetCoverage:readonly number[];
 motifs:readonly Motif[];
};
const p=(index:number,...coords:number[]):Motif=>[index,coords];
/** Sequence is painter's order: visible background -> medium field -> identifying accents.
 * All coordinates are integer art pixels in a periodic 32x32 tile. Motifs
 * can cross its edge and are wrapped across both axes by the rasterizer.
 */
export const HEADWEAR_CAMO_RECIPES:Readonly<Record<HeadwearCamoId,CamoRecipe>>={
 'm81-woodland':{
  label:'M81 WOODLAND',
  description:'Large green/brown/tan organic fields with sparse black branching hooks',
  colors:[[94,111,77],[138,121,90],[64,83,66],[46,54,44]],
  targetCoverage:[.36,.27,.24,.13],
  motifs:[
   p(1,-3,0,6,0,10,3,7,8,1,9,-3,7),
   p(1,16,2,23,0,29,3,27,8,21,10,16,7),
   p(1,1,16,7,13,13,17,11,23,6,26,0,23),
   p(1,18,18,24,14,31,17,34,22,29,25,23,24,18,28),
   p(2,6,3,12,1,16,5,13,11,9,12,5,9),
   p(2,26,8,33,7,36,13,31,17,25,14,23,11),
   p(2,8,23,13,20,19,23,20,29,15,34,9,32),
   p(2,-4,28,2,25,6,30,4,35,-3,35),
   p(3,13,3,15,3,17,7,16,10,19,13,17,15,14,12,13,8),
   p(3,27,17,29,16,30,20,33,23,32,25,28,23),
   p(3,4,25,6,24,8,28,7,31,4,30),
   p(3,2,7,3,5,5,6,4,11,1,14,0,11)
  ]
 },
 'three-color-desert':{
  label:'3-COLOR DESERT',
  description:'Open pale sand with large light-khaki islands and sparse brown branching accents',
  colors:[[193,173,133],[221,201,162],[145,105,73]],
  targetCoverage:[.50,.34,.16],
  motifs:[
   p(1,-3,3,4,0,10,3,11,8,6,12,-3,11),
   p(1,16,0,23,-2,30,2,29,9,23,11,17,8),
   p(1,5,18,13,14,18,17,17,22,11,27,4,25),
   p(1,23,24,29,20,35,22,35,30,28,34,22,30),
   p(2,8,5,11,4,13,7,11,9,8,10,7,13,5,12,6,8),
   p(2,21,13,24,11,26,12,26,17,23,19,24,16,21,16),
   p(2,-2,24,1,22,4,24,5,27,2,28,-1,27),
   p(2,15,28,18,26,19,28,21,29,18,31,15,34)
  ]
 },
 'tiger-stripe':{
  label:'TIGER STRIPE',
  description:'Broken dark tapered directional streaks over green, olive and tan fields',
  colors:[[124,135,91],[77,101,70],[147,122,84],[42,55,43]],
  targetCoverage:[.28,.28,.19,.25],
  motifs:[
   p(1,-4,3,9,2,17,6,27,4,35,7,35,10,23,8,13,10,3,7,-4,8),
   p(2,-4,15,9,12,18,14,31,11,35,13,35,17,23,17,14,19,4,17,-4,19),
   p(1,-4,25,10,22,19,24,34,20,35,24,24,27,12,26,-4,30),
   p(3,-4,0,6,0,16,2,24,1,35,3,35,5,23,4,12,6,2,4,-4,5),
   p(3,-4,10,7,9,14,11,25,9,35,11,35,14,26,12,16,14,7,12,-4,14),
   p(3,-4,21,7,19,17,21,26,18,35,19,35,22,24,21,14,24,5,22,-4,24),
   p(3,-4,30,7,29,15,30,25,27,35,28,35,31,24,30,14,33,3,32,-4,34)
  ]
 },
 ucp:{
  label:'UCP',
  description:'Pale, low-contrast, square-step digital clusters in gray, sage and sand',
  colors:[[166,171,158],[136,146,134],[188,188,169]],
  targetCoverage:[.37,.30,.33],
  motifs:[
   p(1,0,0,9,0,9,3,12,3,12,6,8,6,8,9,3,9,3,5,0,5),
   p(2,14,0,22,0,22,3,26,3,26,7,23,7,23,10,18,10,18,6,14,6),
   p(1,26,11,32,11,32,16,29,16,29,21,24,21,24,17,26,17),
   p(2,0,12,6,12,6,15,10,15,10,19,7,19,7,22,2,22,2,18,0,18),
   p(1,11,13,18,13,18,16,21,16,21,20,16,20,16,23,11,23),
   p(2,2,26,10,26,10,29,14,29,14,33,7,33,7,31,2,31),
   p(1,20,24,27,24,27,27,33,27,33,31,29,31,29,34,23,34,23,30,20,30),
   p(2,29,0,34,0,34,5,30,5,30,8,27,8,27,3,29,3),
   p(2,11,9,14,9,14,11,16,11,16,13,11,13),
   p(1,3,23,6,23,6,26,3,26),
   p(2,19,21,22,21,22,24,19,24)
  ]
 },
 multicam:{
  label:'MULTICAM',
  description:'Multiscale olive and sand organic islands with restrained dark accents',
  colors:[[171,158,117],[206,189,149],[109,126,88],[129,102,74],[67,84,64]],
  targetCoverage:[.30,.23,.24,.16,.07],
  motifs:[
   p(1,-4,1,7,-2,13,1,10,5,4,8,-4,6),
   p(1,18,13,27,11,35,17,34,22,25,23,20,20),
   p(1,5,25,12,22,19,26,17,31,10,35,3,31),
   p(2,9,1,16,-1,23,4,21,9,14,11,8,8),
   p(2,23,23,30,20,35,25,34,31,26,34,22,30),
   p(2,-3,13,4,11,10,16,8,20,2,23,-4,20),
   p(3,15,7,21,5,26,9,25,14,19,15,14,12),
   p(3,2,19,8,17,13,21,11,25,5,27,0,24),
   p(3,28,0,33,-1,34,7,30,9,27,6),
   p(4,12,13,15,12,18,15,17,17,14,17),
   p(4,29,24,31,23,34,27,32,30,29,28),
   p(4,5,5,7,3,9,5,8,7,6,8),
   p(1,16,21,20,19,22,22,21,24,18,25),
   p(2,1,28,4,26,7,28,6,30,3,31)
  ]
 }
};
export const HEADWEAR_CAMO_ELIGIBILITY:Readonly<Record<HeadSilhouetteId,readonly HeadwearCamoId[]>>={
 'patrol-cap':['m81-woodland','three-color-desert','tiger-stripe','ucp','multicam'],
 boonie:['m81-woodland','three-color-desert','tiger-stripe','ucp','multicam'],
 beanie:[],
 ach:['m81-woodland','three-color-desert','ucp','multicam'],
 'high-cut':['m81-woodland','ucp','multicam'],
 pasgt:['m81-woodland','three-color-desert'],
 'soviet-steel':[]
};
export function headwearCamoChoices(model:string):readonly HeadwearCamoId[]{
 const id=model==='high-cut-rails'?'high-cut':model as HeadSilhouetteId;
 return HEADWEAR_CAMO_ELIGIBILITY[id]??[];
}
export function isHeadwearCamoId(value:unknown):value is HeadwearCamoId{
 return typeof value==='string'&&(HEADWEAR_CAMO_IDS as readonly string[]).includes(value);
}
export function resolvedHeadwearCamo(model:string,value:unknown):HeadwearCamoId|null{
 return isHeadwearCamoId(value)&&headwearCamoChoices(model).includes(value)?value:null;
}
function inPolygon(x:number,y:number,coords:readonly number[]):boolean{
 let inside=false;
 for(let i=0,j=coords.length-2;i<coords.length;j=i,i+=2){
  const ax=coords[i],ay=coords[i+1],bx=coords[j],by=coords[j+1];
  if(((ay>y)!==(by>y))&&(x<(bx-ax)*(y-ay)/(by-ay)+ax))inside=!inside;
 }
 return inside;
}
/** Exposes raw indices for tests and the inspection UI; the same data is
 * used for the actual garment map, rather than a separate fake preview.
 */
export function headwearCamoIndices(id:HeadwearCamoId):Uint8Array{
 const data=new Uint8Array(HEADWEAR_CAMO_SIZE**2);
 const shapes=HEADWEAR_CAMO_RECIPES[id].motifs;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const px=x+.5,py=y+.5;let ink=0;
  for(const [tone,polygon] of shapes){
   let marked=false;
   for(const dy of [-32,0,32])for(const dx of [-32,0,32]){
    if(!marked&&inPolygon(px-dx,py-dy,polygon))marked=true;
   }
   if(marked)ink=tone;
  }
  data[y*32+x]=ink;
 }
 return data;
}
const pixelCache=new Map<HeadwearCamoId,Uint8Array>();
export function headwearCamoPixels(id:HeadwearCamoId):Uint8Array{
 const cached=pixelCache.get(id);if(cached)return cached;
 const recipe=HEADWEAR_CAMO_RECIPES[id],indices=headwearCamoIndices(id);
 const bytes=new Uint8Array(32*32*4);
 for(let k=0;k<1024;k++){
  const c=recipe.colors[indices[k]],o=k*4;
  bytes[o]=c[0];bytes[o+1]=c[1];bytes[o+2]=c[2];bytes[o+3]=255;
 }
 pixelCache.set(id,bytes);return bytes;
}
export function headwearCamoCoverage(id:HeadwearCamoId):number[]{
 const counts=HEADWEAR_CAMO_RECIPES[id].colors.map(()=>0);
 for(const i of headwearCamoIndices(id))counts[i]++;
 return counts.map(n=>n/1024);
}