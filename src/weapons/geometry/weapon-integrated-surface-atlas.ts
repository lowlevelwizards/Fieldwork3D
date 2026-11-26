/** WA3 shared exterior artwork atlas. Family authors own their motifs and
 * face selection; this owns deterministic texture generation and caching. */
import * as THREE from 'three';
export type ArtTile=Readonly<{col:number;row:number;bounds:readonly [number,number,number,number]}>;
export type ArtAtlasGrid=Readonly<{tile:number;cols:number;rows:number}>;
export function createIntegratedArtAtlas<T extends string>(
 name:string,grid:ArtAtlasGrid,tiles:Readonly<Record<T,ArtTile>>,
 shade:(tile:T,x:number,y:number)=>number,
 finish?:(data:Uint8Array,width:number,height:number)=>void):THREE.DataTexture{
 const {tile,cols,rows}=grid,width=tile*cols,height=tile*rows;
 if(![tile,cols,rows].every(n=>Number.isInteger(n)&&n>0))throw Error('Invalid art atlas grid');
 const data=new Uint8Array(width*height*4);
 for(const [key,def] of Object.entries(tiles) as [T,ArtTile][]){
  const [x0,x1,y0,y1]=def.bounds;
  if(![def.col,def.row].every(Number.isInteger)||def.col<0||def.col>=cols||def.row<0||def.row>=rows||!(x1>x0&&y1>y0))throw Error('Invalid art atlas tile '+key);
  for(let j=0;j<tile;j++)for(let i=0;i<tile;i++){
   const x=x0+(i+.5)/tile*(x1-x0),y=y0+(j+.5)/tile*(y1-y0);
   const value=shade(key,x,y),n=((def.row*tile+j)*width+def.col*tile+i)*4;
   data[n]=value;data[n+1]=value;data[n+2]=value;data[n+3]=255;
  }
 }
 // Unused texels retain legacy zero fill; plain faces use authored neutral tiles.
 finish?.(data,width,height);
 const map=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
 map.name=name;map.colorSpace=THREE.SRGBColorSpace;
 map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
 map.magFilter=map.minFilter=THREE.NearestFilter;
 map.generateMipmaps=false;map.flipY=false;map.needsUpdate=true;
 return map;
}
export function integratedArtUV(tile:ArtTile,grid:ArtAtlasGrid,x:number,y:number,pad:number):[number,number]{
 const [x0,x1,y0,y1]=tile.bounds;
 const u=Math.max(pad,Math.min(1-pad,(x-x0)/(x1-x0)));
 const v=Math.max(pad,Math.min(1-pad,(y-y0)/(y1-y0)));
 return [(tile.col+u)/grid.cols,(tile.row+v)/grid.rows];
}
/** Cache owned by caller; preserves source type, role and finish. */
export function createIntegratedArtMaterialCache(
 atlas:()=>THREE.DataTexture,tag:string,
 options:{allowBasic?:boolean;idempotent?:boolean}={}){
 const mapped=new WeakMap<THREE.Material,THREE.Material>();
 return (source:THREE.Material):THREE.Material=>{
  if(options.idempotent&&source.userData[tag])return source;
  const found=mapped.get(source);if(found)return found;
  if(!(source instanceof THREE.MeshStandardMaterial)&&
     !(options.allowBasic&&source instanceof THREE.MeshBasicMaterial))return source;
  const material=source.clone() as THREE.MeshStandardMaterial|THREE.MeshBasicMaterial;
  material.map=atlas();material.userData={...source.userData,[tag]:true};
  material.needsUpdate=true;mapped.set(source,material);return material;
 };
}
