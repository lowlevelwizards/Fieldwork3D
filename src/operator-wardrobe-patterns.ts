/** Original, low-resolution tactical fabric pattern library.
 * Shared 32x32 authored-pixel tiles match the operator's existing texel scale.
 * Pattern families are representative, not copied uniform textures.
 */
import * as THREE from 'three';
import {TILE_PIXELS} from './rendering/pixel-recipes.ts';
import type {WardrobePattern} from './operator-wardrobe-data.ts';
const cache=new Map<string,THREE.DataTexture>();
type RGB=readonly [number,number,number];
const PALETTES:readonly (readonly RGB[])[]=[
 [[101,109,82],[65,81,62],[137,128,97],[54,64,58]],
 [[147,133,100],[102,98,79],[182,160,122],[87,82,71]],
 [[103,116,110],[66,81,79],[146,146,131],[47,61,60]],
 [[132,127,115],[85,97,104],[158,154,139],[62,70,74]],
 [[107,124,114],[62,92,87],[133,132,91],[52,77,70]],
 [[159,142,111],[126,110,92],[193,170,128],[102,90,74]],
 [[115,124,111],[72,90,77],[143,156,136],[49,66,57]],
 [[123,120,106],[77,81,70],[159,150,126],[62,65,58]]
];
const hash=(x:number,y:number,seed:number)=>{
 let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
};
const mod=(n:number,m:number)=>(n%m+m)%m;
function index(pattern:WardrobePattern,x:number,y:number,seed:number):number{
 const broad=hash(Math.floor((x+seed%5)/7),Math.floor((y+seed%3)/6),seed)%4;
 const medium=hash(Math.floor((x+seed%3)/4),Math.floor(y/4),seed)%4;
 const small=hash(Math.floor(x/2),Math.floor(y/2),seed)%4;
 switch(pattern){
  case 'solid':return 0;
  case 'woodland':case 'multi-terrain':case 'desert':
   return medium===0?broad:medium===3?3:broad;
  case 'digital-woodland':case 'digital-arid':
  case 'digital-maritime':return small===0?medium:small;
  case 'flecktarn':return hash(x,y,seed)%9<2?3:hash(Math.floor(x/3),Math.floor(y/3),seed)%3;
  case 'flora':return mod(Math.floor((x+y*.35)/5)+broad,4);
  case 'emr':return hash(x*2,y,seed)%5===0?3:small;
  case 'brushstroke':return mod(Math.floor((x*1.1+y*.3)/6)+broad,4);
  case 'tiger':return mod(Math.floor((y+Math.sin(x*.42)*3.5)/3),4);
  case 'swedish-geometric':return mod(Math.floor(x/5)+Math.floor((x+y)/8),4);
  case 'atacs-inspired':return medium%2===0?broad:medium;
  case 'winter':return broad===3?3:2;
  case 'flannel':return x%8===0||y%8===0?3:x%8===1||y%8===1?1:0;
  case 'denim':return mod(x+y,7)===0?1:0;
 }
}
export function wardrobePatternPixels(pattern:WardrobePattern,palette=0):Uint8Array{
 const colors=PALETTES[mod(palette,PALETTES.length)];
 const data=new Uint8Array(TILE_PIXELS*TILE_PIXELS*4);
 for(let y=0;y<TILE_PIXELS;y++)for(let x=0;x<TILE_PIXELS;x++){
  const px=(y*TILE_PIXELS+x)*4;
  const shade=colors[index(pattern,x,y,mod(palette,8))];
  data.set([shade[0],shade[1],shade[2],255],px);
 }
 return data;
}
export function wardrobePatternTexture(pattern:WardrobePattern,palette=0):THREE.DataTexture{
 const key=pattern+':'+mod(palette,PALETTES.length);
 const old=cache.get(key);if(old)return old;
 const data=wardrobePatternPixels(pattern,palette);
 const tex=new THREE.DataTexture(data,TILE_PIXELS,TILE_PIXELS,
   THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.generateMipmaps=true;
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.needsUpdate=true;
 tex.name='fieldwork-wardrobe-'+key;
 cache.set(key,tex);
 return tex;
}
export const wardrobePatternCount=()=>cache.size;
