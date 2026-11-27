/** FW13: small, deterministic pixel artwork on the existing shoe/shaft.
 * Four 32x32 projection tiles in one shared atlas per model. No decal meshes,
 * extra draw calls, canvas/browser dependency, or per-rig texture disposal.
 * White/grey values multiply the existing colorway and color-ledger tint. */
import * as THREE from 'three';
import type {FootwearId} from './operator-footwear-catalog.ts';
type Shod=Exclude<FootwearId,'bare-feet'>;
const SIZE=64,TILE=32,INNER=28;
type Tile='top'|'side'|'shaft-front'|'shaft-side';
const ORIGINS:Record<Tile,readonly [number,number]>={top:[0,0],side:[32,0],'shaft-front':[0,32],'shaft-side':[32,32]};
type PixelArt={laces:number;canvas:boolean;rubberToe:boolean;shaftLaces:number};
const ART:Record<Shod,PixelArt>={
 'combat-boots':{laces:4,canvas:true,rubberToe:false,shaftLaces:3},
 'leather-boots':{laces:4,canvas:false,rubberToe:false,shaftLaces:4},
 'hiking-boots':{laces:4,canvas:true,rubberToe:true,shaftLaces:2},
 'hiking-shoes':{laces:4,canvas:false,rubberToe:true,shaftLaces:0},
 sneakers:{laces:3,canvas:false,rubberToe:false,shaftLaces:0}
};
const cache=new Map<Shod,THREE.DataTexture>();
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
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
 // Top tile: +X is toe-forward, Z spans the shoe. Broad tongue and
 // transverse two-pixel lace strokes across the instep, not the toe.
 rect('top',7,9,21,19,200);
 for(let i=0;i<spec.laces;i++){
  const x=9+i*3;
  rect('top',x,8,x+2,20,125);
  rect('top',x,10,x+1,18,245);
 }
 // Paint a single broad stepped textile block on both lateral faces.
 // Sparse woven pixels remain subordinate to the panel silhouette.
 if(spec.canvas){
  rect('side',2,8,15,22,178);
  rect('side',4,6,15,8,178);
  rect('side',15,10,17,18,178);
  rect('side',3,9,14,21,222);
  rect('side',5,7,14,9,222);
  rect('side',14,11,16,17,222);
  for(let y=11;y<20;y+=3)for(let x=5;x<13;x+=3)
   rect('side',x+(y%2),y,x+(y%2)+1,y+1,194);
  rect('shaft-side',4,3,24,25,183);
  rect('shaft-side',6,5,22,23,224);
  for(let y=7;y<22;y+=4)for(let x=8;x<22;x+=4)
   rect('shaft-side',x+(y%2),y,x+(y%2)+1,y+1,197);
 }
 if(spec.rubberToe){
  // Toe bumper is a printed material region, never another prism.
  rect('side',20,0,28,13,128);
  rect('side',22,13,28,17,128);
  rect('top',21,0,28,28,128);
  rect('top',20,0,21,6,128);
  rect('top',20,22,21,28,128);
 }
 if(spec.shaftLaces){
  rect('shaft-front',8,2,20,26,196);
  for(let i=0;i<spec.shaftLaces;i++){
   const y=5+i*5;
   rect('shaft-front',7,y,21,y+2,125);
   rect('shaft-front',10,y,18,y+1,245);
  }
 }
 // Extend each tile's border pixels through the two-texel gutter, so
 // mip filtering cannot immediately bleed a neighboring projection.
 for(const [tile,src] of tiles){
  const [ox,oy]=ORIGINS[tile];
  for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
   const sx=Math.max(0,Math.min(INNER-1,x-2)),sy=Math.max(0,Math.min(INNER-1,y-2));
   const v=src[sy*INNER+sx],i=((oy+y)*SIZE+ox+x)*4;
   pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
  }
 }
 const tex=new THREE.DataTexture(pixels,SIZE,SIZE,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.name='FW13 footwear '+id;tex.colorSpace=THREE.SRGBColorSpace;
 tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapLinearFilter;
 tex.generateMipmaps=true;tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.needsUpdate=true;cache.set(id,tex);return tex;
}
function atlasUV(uv:THREE.BufferAttribute,i:number,tile:Tile,u:number,v:number){
 const [x,y]=ORIGINS[tile];
 uv.setXY(i,(x+2.5+clamp(u)*(INNER-1))/SIZE,(y+2.5+clamp(v)*(INNER-1))/SIZE);
}
// Extrusion has independent vertices/normals for each planar face.
// Project both side faces identically (no mirrored/pasted lace on the sides).
export function mapFootwearUpperUV(geo:THREE.BufferGeometry,width:number){
 const pos=geo.getAttribute('position'),normal=geo.getAttribute('normal');
 const uv=geo.getAttribute('uv') as THREE.BufferAttribute;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  if(Math.abs(normal.getZ(i))>.9)atlasUV(uv,i,'side',(x+2.4)/8,(y+.9)/3);
  else if(normal.getY(i)>.15||normal.getX(i)>.9)
   atlasUV(uv,i,'top',(x+2.4)/8,z/width+.5);
  else atlasUV(uv,i,'top',0,0);
 }
 uv.needsUpdate=true;
}
export function mapFootwearShaftUV(geo:THREE.BufferGeometry,width:number,height:number){
 const pos=geo.getAttribute('position'),normal=geo.getAttribute('normal');
 const uv=geo.getAttribute('uv') as THREE.BufferAttribute;
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i)/height+.5;
  if(normal.getX(i)>.9)atlasUV(uv,i,'shaft-front',pos.getZ(i)/width+.5,1-y);
  else if(Math.abs(normal.getZ(i))>.9)atlasUV(uv,i,'shaft-side',pos.getX(i)/width+.5,1-y);
  else atlasUV(uv,i,'shaft-front',0,0);
 }
 uv.needsUpdate=true;
}
