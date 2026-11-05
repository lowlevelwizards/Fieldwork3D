/** Fieldwork Camouflage 7A — original pixel artwork, no scanned cloth.
 * MultiCam-family additions preserve the established 32px master exactly.
 * Later specialty families are constructed from their own authored shapes.
 */
import {specialty7AIndices} from './operator-camo-7a-specialty.ts';
export const CAMO7A_IDS=[
 'multicam-black','multicam-alpine',
 'pencott-greenzone','pencott-badlands',
 'desert-night','kryptek-highlander','berezka','spectre-skwo'
] as const;
export type Camo7AId=typeof CAMO7A_IDS[number];
export type RGB7A=readonly [number,number,number];
export type Camo7ARecipe={
 label:string;description:string;colors:readonly RGB7A[];
 targetCoverage:readonly number[];motifs:readonly (readonly [number,readonly number[]])[];
};
const recipes={
 'multicam-black':{
  label:'MULTICAM BLACK',
  description:'Original MultiCam seven-ink silhouette in subdued blue-charcoal, graphite, black-green and a rare fog-gray glint',
  colors:[[43,52,51],[68,75,71],[36,46,43],[59,64,61],[23,29,31],[109,114,108],[78,84,77]],
  targetCoverage:[.22,.23,.25,.17,.05,.04,.04],motifs:[]
 },
 'multicam-alpine':{
  label:'MULTICAM ALPINE',
  description:'Original MultiCam seven-ink silhouette as snowy off-white, pearl-gray, misted stone and sparse slate shadow',
  colors:[[216,216,207],[239,239,231],[187,195,192],[171,175,166],[121,133,129],[248,248,241],[203,205,200]],
  targetCoverage:[.22,.23,.25,.17,.05,.04,.04],motifs:[]
 },
 'pencott-greenzone':{
  label:'PENCOTT GREENZONE',
  description:'Dense hybrid fractal woodland: angular macro islands, connected irregular mid-pixels and dark deep-green/brown micro clusters',
  colors:[[166,170,113],[115,143,86],[71,110,68],[44,75,52],[113,91,63]],
  targetCoverage:[.26,.27,.23,.16,.08],motifs:[]
 },
 'pencott-badlands':{
  label:'PENCOTT BADLANDS',
  description:'Same PenCott three-scale hybrid index topology, recolored to muted sand, brown-khaki, sage and dark upland earth',
  colors:[[205,191,155],[176,155,116],[139,135,102],[96,99,81],[86,70,57]],
  targetCoverage:[.26,.27,.23,.16,.08],motifs:[]
 },
 'desert-night':{
  label:'DESERT NIGHT',
  description:'Historical sage-green regular lattice under irregular low-profile dark blotches, not a pixelated woodland print',
  colors:[[133,151,125],[84,105,83],[46,67,56]],
  targetCoverage:[.65,.28,.07],motifs:[]
 },
 'kryptek-highlander':{
  label:'KRYPTEK HIGHLANDER',
  description:'Layered rocky earth forms with crossing angular fracture lattice and dark ink fissures',
  colors:[[195,178,140],[160,139,100],[121,111,82],[94,86,69],[49,58,49]],
  targetCoverage:[.29,.27,.22,.15,.07],motifs:[]
 },
 berezka:{
  label:'KLMK BEREZKA',
  description:'Soviet sunray camouflage with rows of irregular bright leaflets on a deep olive ground',
  colors:[[85,105,65],[182,184,113],[214,207,152],[55,72,52]],
  targetCoverage:[.62,.24,.10,.04],motifs:[]
 },
 'spectre-skwo':{
  label:'SPECTRE SKWO',
  description:'Fractured Spectre-derived olive/sage corridors, compact stepped dark links and restrained khaki-brown punctuation',
  colors:[[158,154,121],[112,126,91],[83,105,71],[117,94,70],[46,62,46]],
  targetCoverage:[.26,.28,.23,.16,.07],motifs:[]
 }
 } satisfies Record<Camo7AId,Camo7ARecipe>;
/** Coverage is measured from the authored master, never forced through
 * percentile thresholds that destroy characteristic structures. Memoized.
 */
const coverageCache=new Map<Camo7AId,readonly number[]>();
export const CAMO7A_RECIPES:Readonly<Record<Camo7AId,Camo7ARecipe>>=
 Object.fromEntries(CAMO7A_IDS.map(id=>{
  const entry=recipes[id];
  return [id,{
   ...entry,
   get targetCoverage():readonly number[]{
    const previous=coverageCache.get(id);
    if(previous)return previous;
    if(id==='multicam-black'||id==='multicam-alpine')return entry.targetCoverage;
    const counts=entry.colors.map(()=>0);
    for(const ink of camo7AIndices(id))counts[ink]++;
    const coverage=counts.map(n=>n/4096);
    coverageCache.set(id,coverage);
    return coverage;
   }
  }];
 })) as unknown as Record<Camo7AId,Camo7ARecipe>;
export function isCamo7AId(value:string):value is Camo7AId{
 return (CAMO7A_IDS as readonly string[]).includes(value);
}
const SIZE=64;
/** PenCott-family geometry: authored 64px macro regions. Secondary grouped
 * stepped pixels are attached to these forms; no per-frame random noise.
 * Both colorways share exactly the same complete ink mask.
 */
type Motif7A=readonly [number,readonly number[]];
const m=(tone:number,...xy:number[]):Motif7A=>[tone,xy];
const PENCOTT_SHAPES:readonly Motif7A[]=[
 m(1,-8,0,7,-4,19,3,25,10,19,17,13,15,7,23,-5,21),
 m(1,25,-5,41,-3,49,4,61,2,70,12,66,23,54,20,45,26,38,19,27,15),
 m(1,-6,27,8,22,19,29,27,27,37,36,31,45,18,43,13,51,5,48,-6,54),
 m(1,31,47,43,42,52,45,65,40,72,51,65,63,54,61,45,69,32,65),
 m(2,5,3,16,-2,23,7,31,9,27,18,16,22,11,19,8,27,1,22),
 m(2,32,-6,43,2,52,1,59,10,58,21,50,24,45,30,38,23,35,14),
 m(2,-5,32,7,27,15,30,23,38,18,45,24,50,17,55,7,51,0,58,-6,54),
 m(2,31,31,44,25,52,33,64,30,71,39,66,50,57,49,48,56,41,50,32,56),
 m(2,4,53,13,48,25,55,32,65,21,71,8,67,-5,63),
 m(3,11,5,18,4,25,10,23,18,30,19,24,28,19,25,15,30,9,24),
 m(3,45,2,53,-2,61,5,60,15,66,20,57,25,52,32,45,24,41,17),
 m(3,-5,39,7,34,16,42,25,44,20,52,26,57,17,62,8,58,-4,64),
 m(3,32,41,42,36,49,40,58,39,67,44,63,52,55,55,48,63,40,57,33,63),
 m(4,4,7,9,5,13,10,11,15,16,17,12,21,6,19),
 m(4,24,15,29,12,33,17,31,21,37,23,32,27,27,24),
 m(4,52,23,56,20,62,25,60,30,65,34,58,34,51,30),
 m(4,11,43,17,40,21,45,19,49,24,52,20,55,13,52),
 m(4,40,56,46,53,52,58,49,64,44,67,38,61),
 m(0,24,2,29,0,34,4,31,9,27,10,23,7),
 m(0,43,29,48,26,53,31,50,36,46,37,40,34),
 m(0,5,60,10,56,16,59,15,65,8,68)
];
function shapeContains(x:number,y:number,coords:readonly number[]):boolean{
 let seen=false;
 for(let i=0,j=coords.length-2;i<coords.length;j=i,i+=2){
  const ax=coords[i],ay=coords[i+1],bx=coords[j],by=coords[j+1];
  if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)seen=!seen;
 }
 return seen;
}
function wrappedShape(x:number,y:number,coords:readonly number[]):boolean{
 for(const dy of [-64,0,64])for(const dx of [-64,0,64])
  if(shapeContains(x+.5-dx,y+.5-dy,coords))return true;
 return false;
}
function artHash(x:number,y:number,seed:number):number{
 let n=Math.imul((x+seed*131)^(Math.imul(y+37,7357)),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x119de1f3);
 return ((n^(n>>>15))>>>0)/4294967295;
}
function paintShapes(shapes:readonly Motif7A[],base:number):Uint8Array{
 const out=new Uint8Array(SIZE*SIZE);out.fill(base);
 for(const [tone,poly] of shapes)
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
   if(wrappedShape(x,y,poly))out[y*SIZE+x]=tone;
 return out;
}
function pencottMaster():Uint8Array{
 const base=paintShapes(PENCOTT_SHAPES,0);
 const out=base.slice();
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const i=y*SIZE+x,ink=base[i],h4=artHash(x>>2,y>>2,23);
  const h2=artHash(x>>1,y>>1,61);
  const neighbor=base[y*SIZE+((x+2)&63)];
  const down=base[((y+2)&63)*SIZE+x];
  // Fractal false edges: micro and midi clusters track existing ink
  // boundaries, producing depth rather than a uniformly speckled overlay.
  if(ink!==neighbor&&h4>.52)out[i]=neighbor;
  else if(ink!==down&&h2>.69)out[i]=down;
  else if(ink===1&&h4>.80&&h2>.28)out[i]=2;
  else if(ink===2&&h4>.84&&h2>.36)out[i]=3;
  else if(ink===0&&h4>.82&&h2>.4)out[i]=1;
  else if(ink===3&&h4<.11&&h2>.5)out[i]=4;
 }
 return out;
}
const tileCache=new Map<Camo7AId,Uint8Array>();
function expandMultiCam(source?:Uint8Array):Uint8Array{
 if(!source||source.length!==1024)
  throw new Error('Camouflage 7A MultiCam families need original 32px index master');
 const out=new Uint8Array(SIZE*SIZE);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
  out[y*SIZE+x]=source[(y>>1)*32+(x>>1)];
 return out;
}
export function camo7AIndices(id:Camo7AId,multicamBase?:Uint8Array):Uint8Array{
 if(id==='multicam-black'||id==='multicam-alpine')
  return expandMultiCam(multicamBase);
 const cached=tileCache.get(id);
 if(cached)return cached.slice();
 if(id==='pencott-greenzone'||id==='pencott-badlands'){
  const tile=pencottMaster();tileCache.set(id,tile);return tile.slice();
 }
 if(id==='desert-night'||id==='kryptek-highlander'||id==='berezka'||id==='spectre-skwo'){
  const tile=specialty7AIndices(id);tileCache.set(id,tile);return tile.slice();
 }
 throw new Error('Missing 7A authored family raster for '+id);
}
