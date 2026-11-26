/** MA-R: one physical art pixel per world unit, independent of storage.
 * Existing atlas sizes remain bounded until a density candidate is approved. */
export const ART_PIXEL=1;
export const ART_OPERATOR_HEIGHT=40;
export const ART_TILE_SIZE=32;
export const artCenter=(world:number)=> (Math.floor(world/ART_PIXEL)+.5)*ART_PIXEL;
export const artSpan=(world:number)=>Math.max(ART_PIXEL,Math.round(world/ART_PIXEL)*ART_PIXEL);
export const ART_MODULES={brick:[16,8],cinderblock:[32,16],tile:[8,8],siding:[32,8],panel:[16,32],concrete:[32,32]} as const;
export function wallDensity(length:number,height:number,width:number,rows:number){
 return {x:length/width,y:height/rows,candidateWidth:Math.ceil(length/ART_PIXEL),candidateRows:Math.ceil(height/ART_PIXEL)};
}
export function physicalMaskIndex(u:number,v:number,w:number,h:number,size=32){
 const x=Math.max(0,Math.min(size-1,Math.floor(artCenter(u*w)/w*size)));
 const y=Math.max(0,Math.min(size-1,Math.floor(artCenter(v*h)/h*size)));
 return (y*size+x)*4;
}

/** Both layouts preserve edge swatches and guarded independent faces. */
export const LEGACY_WALL_LAYOUT={rows:64,faceRows:24,front:4,back:36} as const;
export const METRIC_WALL_LAYOUT={rows:128,faceRows:56,front:4,back:68} as const;
export const wallAtlasLayout=(metric=false)=>metric?METRIC_WALL_LAYOUT:LEGACY_WALL_LAYOUT;
export const metricActiveWidth=(length:number,capacity:number)=>Math.max(1,Math.min(capacity,Math.ceil(length/ART_PIXEL)));
