/** Fieldwork Camouflage 7A — original pixel artwork, no scanned cloth.
 * MultiCam-family additions preserve the established 32px master exactly.
 * Later specialty families are constructed from their own authored shapes.
 */
export const CAMO7A_IDS=[
 'multicam-black','multicam-alpine'
 // BATCH_7A_IDS
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
 }
 // BATCH_7A_RECIPES
} satisfies Record<Camo7AId,Camo7ARecipe>;
export const CAMO7A_RECIPES:Readonly<Record<Camo7AId,Camo7ARecipe>>=recipes;
export function isCamo7AId(value:string):value is Camo7AId{
 return (CAMO7A_IDS as readonly string[]).includes(value);
}
const SIZE=64;
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
 // BATCH_7A_RENDERER
 throw new Error('Missing 7A authored family raster for '+id);
}
