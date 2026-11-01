/** Structured integer-pixel material motifs. The blank pixel is white
 * so source colors remain exactly those authored in building palettes. */
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
export const MATERIAL_RECIPE_VERSION=3;
const hash=(x:number,y:number,s:number)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
};
const mod=(n:number,m:number)=>((n%m)+m)%m;
export function pixelPattern(kind:PixelSurface,seed=0,size=32):Uint8Array{
 if(!Number.isInteger(size)||size<8||size>256||(size&(size-1))!==0)
  throw Error('Pixel tiles require power-of-two dimensions from 8 through 256');
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let shade=255;
  switch(kind){
   case 'wood':{
    const board=Math.floor(y/8),offset=(board%2)*11+seed%7;
    const joint=mod(x+offset,size)===0;
    if(y%8===0)shade=207;
    else if(y%8===1)shade=246;
    else if(joint)shade=215;
    else if(y%8===5&&hash(Math.floor((x+offset)/12),board,seed)%11===0&&x%12<6)
      shade=248; // a short directional grain mark, not whole-surface mottling
    break;
   }
   case 'brick':{
    const row=Math.floor(y/8);
    if(y%8===0||mod(x+(row%2)*8+seed%2,16)===0)shade=217;
    break;
   }
   case 'tile':
    if(x%8===0||y%8===0)shade=231;
    break;
   case 'metal':
    if(x%16===0)shade=249;
    break;
   case 'concrete':
    if((x===0||y===0)&&seed%3===0)shade=249;
    break;
   case 'rubber':
    if(x%8===0&&y%8<2)shade=246;
    break;
   case 'fabric':case 'carpet':
    // Fabrics are intentionally flat at tactical scale; visible seams use geometry.
    break;
   case 'earth':case 'foliage':case 'gravel':case 'asphalt':
   case 'plaster':case 'paper':
    break;
  }
  const i=(y*size+x)*4;
  out[i]=shade;out[i+1]=shade;out[i+2]=shade;out[i+3]=255;
 }
 return out;
}
export function pixelRepeats(width:number,height:number):[number,number]{
 return [Math.max(0,width)/TILE_WORLD_SIZE,Math.max(0,height)/TILE_WORLD_SIZE];
}
