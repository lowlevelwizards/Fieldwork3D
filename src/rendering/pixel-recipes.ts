/** Fieldwork pixel materials: clean baseline, structure before surface variation. */
export type PixelSurface =
 'wood'|'plaster'|'brick'|'concrete'|'tile'|'carpet'|'metal'|
 'fabric'|'asphalt'|'earth'|'gravel'|'rubber'|'foliage'|'paper';
export const OPERATOR_REFERENCE_HEIGHT=40;
export const TEXELS_PER_OPERATOR=32;
export const PIXEL_WORLD_SIZE=OPERATOR_REFERENCE_HEIGHT/TEXELS_PER_OPERATOR;
export const TILE_PIXELS=32;
export const TILE_WORLD_SIZE=TILE_PIXELS*PIXEL_WORLD_SIZE;
export const PIXEL_SURFACES:readonly PixelSurface[]=[
 'wood','plaster','brick','concrete','tile','carpet','metal',
 'fabric','asphalt','earth','gravel','rubber','foliage','paper'
];
export const MATERIAL_RECIPE_VERSION=2;
export function pixelPattern(kind:PixelSurface,seed=0,size=32):Uint8Array{
 if(!Number.isInteger(size)||size<8||size>256||(size&(size-1))!==0)
  throw Error('Pixel tiles require power-of-two dimensions from 8 through 256');
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let shade=255;
  if(kind==='wood'){
   if(y%8===0)shade=204;
   else if(y%8===1)shade=239;
   else if((x+(Math.floor(y/8)%2)*11)%size===0)shade=217;
  }else if(kind==='tile'){
   if(x%8===0||y%8===0)shade=224;
  }else if(kind==='brick'){
   if(y%8===0||(x+(Math.floor(y/8)%2)*8)%16===0)shade=215;
  }else if(kind==='metal'){
   if(x%16===0)shade=246;
  }else if(kind==='rubber'){
   if(x%8===0&&y%8<2)shade=244;
  }
  const i=(y*size+x)*4;
  out[i]=shade;out[i+1]=shade;out[i+2]=shade;out[i+3]=255;
 }
 return out;
}
/** Texture coordinates use shared physical world units, not object-local pixels. */
export function pixelRepeats(width:number,height:number):[number,number]{
 return [Math.max(0,width)/TILE_WORLD_SIZE,Math.max(0,height)/TILE_WORLD_SIZE];
}
