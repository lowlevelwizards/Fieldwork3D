/** FW13: artwork authored on Fieldwork's shared physical pixel grid.
 * Atlas storage is independent of density. All exposed faces use metric UVs;
 * articulated shafts compensate for normalized shin coordinates. */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';
import {LEG_LOWER_LENGTH} from './breach-leg-geometry.ts';
import type {FootwearId} from './operator-footwear-catalog.ts';
type Shod=Exclude<FootwearId,'bare-feet'>;
type Pt=readonly [number,number];
const SIZE=64,TILE=32,INNER=28,GUTTER=2;
type Tile='top'|'side'|'shaft-front'|'shaft-side';
const ORIGINS:Record<Tile,readonly [number,number]>={top:[0,0],side:[32,0],'shaft-front':[0,32],'shaft-side':[32,32]};
type PixelArt={laces:readonly number[];canvas:boolean;rubberToe:boolean;shaftLaces:readonly number[]};
const ART:Record<Shod,PixelArt>={
 'combat-boots':{laces:[1,3,5],canvas:true,rubberToe:false,shaftLaces:[1,3]},
 'leather-boots':{laces:[1,3,5],canvas:false,rubberToe:false,shaftLaces:[0,2,4]},
 'hiking-boots':{laces:[1,3,5],canvas:true,rubberToe:true,shaftLaces:[1]},
 'hiking-shoes':{laces:[1,3,5],canvas:false,rubberToe:true,shaftLaces:[]},
 sneakers:{laces:[2,4],canvas:false,rubberToe:false,shaftLaces:[]}
};
const cache=new Map<Shod,THREE.DataTexture>();
export function footwearDetailTexture(id:Shod):THREE.DataTexture{
 const existing=cache.get(id);if(existing)return existing;
 const spec=ART[id],pixels=new Uint8Array(SIZE*SIZE*4);
 const tiles=new Map<Tile,Uint8Array>();
 for(const tile of Object.keys(ORIGINS) as Tile[])tiles.set(tile,new Uint8Array(INNER*INNER).fill(255));
 function rect(tile:Tile,x0:number,y0:number,x1:number,y1:number,value:number){
  const dst=tiles.get(tile)!;
  for(let y=Math.max(0,y0);y<Math.min(INNER,y1);y++)
   for(let x=Math.max(0,x0);x<Math.min(INNER,x1);x++)dst[y*INNER+x]=value;
 }
 // Coordinates below are actual art texels, not normalized percentages.
 // One transverse stroke is one shared art pixel thick. The centre of
 // the six-world-unit shoe width is at row 3. No sub-pixel stitching.
 rect('top',1,1,6,5,190);
 for(const x of spec.laces){
  rect('top',x,1,x+1,5,115);
  rect('top',x,2,x+1,4,245);
 }
 if(spec.canvas){
  // Large stepped side block, with a single restrained weave pixel.
  rect('side',1,1,5,2,178);
  rect('side',1,2,4,3,218);
  rect('side',2,1,3,2,205);
  rect('shaft-side',1,0,4,4,181);
  rect('shaft-side',1,1,4,3,222);
  rect('shaft-side',2,2,3,3,195);
 }
 if(spec.rubberToe){
  rect('side',6,0,8,2,128);
  rect('side',7,2,8,3,128);
  // The extrusion perimeter is unfolded from the rear of the instep
  // toward the toe; front face continues without a collapsed UV seam.
  rect('top',6,0,10,6,128);
 }
 if(spec.shaftLaces.length){
  rect('shaft-front',1,0,4,5,190);
  for(const y of spec.shaftLaces){
   rect('shaft-front',1,y,4,y+1,115);
   rect('shaft-front',2,y,3,y+1,245);
  }
 }
 for(const [tile,src] of tiles){
  const [ox,oy]=ORIGINS[tile];
  for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
   const sx=Math.max(0,Math.min(INNER-1,x-GUTTER)),sy=Math.max(0,Math.min(INNER-1,y-GUTTER));
   const v=src[sy*INNER+sx],i=((oy+y)*SIZE+ox+x)*4;
   pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
  }
 }
 const tex=new THREE.DataTexture(pixels,SIZE,SIZE,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.name='FW13 metric footwear '+id;tex.colorSpace=THREE.SRGBColorSpace;
 tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapLinearFilter;
 tex.generateMipmaps=true;tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.needsUpdate=true;cache.set(id,tex);return tex;
}
function metricUV(uv:THREE.BufferAttribute,i:number,tile:Tile,uWorld:number,vWorld:number){
 const [x,y]=ORIGINS[tile];
 // Do not normalize to tile dimensions: one world-space art pixel must
 // span precisely one source texel regardless of footwear size or slope.
 uv.setXY(i,(x+GUTTER+uWorld/PIXEL_WORLD_SIZE)/SIZE,(y+GUTTER+vWorld/PIXEL_WORLD_SIZE)/SIZE);
}
// Independent planar extrude faces use true surface arclength around the
// shoe's profile, including steep instep, toe, rear and sole-facing edges.
// This avoids foreshortening on slopes and degenerate UVs on vertical faces.
export function mapFootwearUpperUV(geo:THREE.BufferGeometry,profile:readonly Pt[]){
 const pos=geo.getAttribute('position'),normal=geo.getAttribute('normal');
 const uv=geo.getAttribute('uv') as THREE.BufferAttribute;
 const points=[...profile].reverse();
 const edges:{x:number;y:number;dx:number;dy:number;length:number;start:number}[]=[];
 let perimeter=0;
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i],[nx,ny]=points[(i+1)%points.length];
  const length=Math.hypot(nx-x,ny-y);
  if(length===0)continue;
  edges.push({x,y,dx:(nx-x)/length,dy:(ny-y)/length,length,start:perimeter});
  perimeter+=length;
 }
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  if(Math.abs(normal.getZ(i))>.9){
   metricUV(uv,i,'side',x+2.4,y+1);
  }else{
   // Match the extrusion face normal, not just its shared corner position.
   let best=Infinity,s=0;
   for(const e of edges){
    const t=Math.max(0,Math.min(e.length,(x-e.x)*e.dx+(y-e.y)*e.dy));
    const error=Math.hypot(x-e.x-t*e.dx,y-e.y-t*e.dy);
    const facing=normal.getX(i)*(-e.dy)+normal.getY(i)*e.dx;
    const score=error+4*(1-facing);
    if(score<best){best=score;s=e.start+t;}
   }
   metricUV(uv,i,'top',s,z+3);
  }
 }
 uv.needsUpdate=true;
}
export function mapFootwearShaftUV(geo:THREE.BufferGeometry,height:number){
 const pos=geo.getAttribute('position'),normal=geo.getAttribute('normal');
 const uv=geo.getAttribute('uv') as THREE.BufferAttribute;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i);
  const y=(height/2-pos.getY(i))*LEG_LOWER_LENGTH;
  if(normal.getX(i)>.9)metricUV(uv,i,'shaft-front',z+2,y);
  else if(Math.abs(normal.getZ(i))>.9)metricUV(uv,i,'shaft-side',x+2,y);
  else if(normal.getX(i)<-.9)metricUV(uv,i,'shaft-front',z+10,y);
  else metricUV(uv,i,'shaft-front',x+10,z+2);
 }
 uv.needsUpdate=true;
}
