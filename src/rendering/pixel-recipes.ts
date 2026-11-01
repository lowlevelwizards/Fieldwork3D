/** Deterministic integer-grid texture recipes. No DOM, WebGL, or random state. */
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
const hash=(x:number,y:number,seed:number)=>{
 let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed|0,1442695041);
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
};
const shades=[184,197,209,219,229,238,246,252];
const mod=(n:number,m:number)=>((n%m)+m)%m;
export function pixelPattern(kind:PixelSurface,seed=0,size=32):Uint8Array{
 if(!Number.isInteger(size)||size<8||size>256||(size&(size-1))!==0)
  throw Error('Pixel tiles require power-of-two dimensions from 8 through 256');
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  // Small *clusters*, rather than unrelated bright noise every pixel.
  const coarse=hash(Math.floor(x/3),Math.floor(y/3),seed);
  const fine=hash(x,y,seed);
  let shade=4+((coarse>>>9)%3)-1;
  switch(kind){
   case 'wood': {
    const board=Math.floor(y/8),grain=hash(Math.floor(x/5),board,seed+11);
    shade+=((grain>>>4)%3)-1;
    if(y%8===0)shade-=3;
    if(y%8===1)shade-=1;
    if(mod(x+(board%2)*11,size)===0)shade-=2;
    if(y%8===4&&fine%13===0)shade-=2;
    break;
   }
   case 'brick': {
    const row=Math.floor(y/8),join=mod(x+(row%2)*8,16);
    if(y%8===0||join===0)shade-=3;
    else if(y%8===1||join===1)shade-=1;
    break;
   }
   case 'tile':
    if(x%8===0||y%8===0)shade-=3;
    else if(x%8===1||y%8===1)shade-=1;
    break;
   case 'metal':
    if(x%16===0)shade-=2;
    if(y%16===0)shade+=1;
    if(fine%37===0)shade-=2;
    break;
   case 'fabric': case 'carpet':
    shade+=(x%4===0?1:0)+(y%4===0?-1:0);
    if(fine%19===0)shade-=1;
    break;
   case 'foliage':
    shade+=(coarse%5)-2;
    if(fine%17===0)shade+=1;
    break;
   case 'asphalt': case 'gravel': case 'earth':
    shade+=((coarse>>>6)%5)-2;
    if(fine%29===0)shade+=(kind==='gravel'?2:-1);
    break;
   case 'concrete':
    if(fine%41===0)shade-=2;
    break;
   case 'plaster':
    if(fine%53===0)shade-=1;
    break;
   case 'rubber':
    if(x%8===0&&y%8<3)shade-=2;
    break;
   case 'paper':
    if(y%9===0&&x>3&&x<size-4)shade-=1;
    break;
  }
  const lum=shades[Math.max(0,Math.min(shades.length-1,shade))];
  const i=(y*size+x)*4;
  out[i]=lum;out[i+1]=lum;out[i+2]=lum;out[i+3]=255;
 }
 return out;
}
/** Texture coordinates are expressed in physical world units, never per-object pixels. */
export function pixelRepeats(width:number,height:number):[number,number]{
 return [Math.max(0,width)/TILE_WORLD_SIZE,Math.max(0,height)/TILE_WORLD_SIZE];
}
