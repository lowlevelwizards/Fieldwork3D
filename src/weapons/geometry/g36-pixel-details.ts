/** G36 FT1.9D1: one 384x192 nearest-pixel atlas for readable exterior marks.
 * No added overlays, side mirrored ejection details, geometry count changes,
 * transparency, per-frame materials, per-instance texture uploads or shaders.
 * The same live-intended original G36 meshes are UV projected in place.
 */
import * as THREE from 'three';
type Region='guard'|'receiver'|'lower'|'magazine';
type Tile='guard-right'|'guard-left'|'receiver-right'|'receiver-left'|
 'lower-right'|'lower-left'|'magazine-right'|'magazine-left';
type Bounds=readonly [number,number,number,number];
const TILE=96,COLS=4,ROWS=2;
const definitions:Readonly<Record<Tile,{col:number;row:number;bounds:Bounds}>>={
 'guard-right':{col:0,row:0,bounds:[3.75,13.45,-2.15,1.55]},
 'guard-left':{col:1,row:0,bounds:[3.75,13.45,-2.15,1.55]},
 'receiver-right':{col:2,row:0,bounds:[-6.80,4.0,-1.70,1.52]},
 'receiver-left':{col:3,row:0,bounds:[-6.80,4.0,-1.70,1.52]},
 'lower-right':{col:0,row:1,bounds:[-6.45,3.75,-3.65,-1.0]},
 'lower-left':{col:1,row:1,bounds:[-6.45,3.75,-3.65,-1.0]},
 'magazine-right':{col:2,row:1,bounds:[-1.12,3.20,-7.27,-2.60]},
 'magazine-left':{col:3,row:1,bounds:[-1.12,3.20,-7.27,-2.60]}
};
const between=(v:number,a:number,b:number)=>v>=a&&v<=b;
const zone=(x:number,y:number,x0:number,x1:number,y0:number,y1:number)=>
 between(x,x0,x1)&&between(y,y0,y1);
/** Graphic marks, not functional features. White is neutral and multiplies
 * the normal shared material tint and lighting. The right-side receiver
 * feature is deliberately NOT copied onto the other face.
 */
function ink(tile:Tile,x:number,y:number):number{
 if(tile==='guard-right'||tile==='guard-left'){
  for(const center of [5.42,7.45,9.48,11.51])
   if(zone(x,y,center-.64,center+.64,-.06,.44))return 105;
  if(zone(x,y,4.92,12.45,-1.48,-1.35))return 206;
  return 255;
 }
 if(tile==='receiver-right'){
  if(zone(x,y,-.81,1.75,.12,.67))return 99;
  if(zone(x,y,-5.35,2.38,-1.18,-1.08))return 205;
  return 255;
 }
 if(tile==='receiver-left'){
  if(zone(x,y,-5.44,-1.30,.30,.43))return 213;
  if(zone(x,y,-5.35,2.38,-1.18,-1.08))return 210;
  return 255;
 }
 if(tile==='lower-right'||tile==='lower-left'){
  if(zone(x,y,-5.40,2.50,-1.57,-1.44))return 208;
  if(Math.hypot(x+4.95,y+2.16)<.38)return 124;
  return 255;
 }
 if(tile==='magazine-right'||tile==='magazine-left'){
  if(y < -7.11)return 166;
  const shift=Math.max(0,Math.min(4.1,-y-3.05))*.29;
  for(const base of [-.66,.42,1.50])
   if(Math.abs(x-(base+shift))<.135&&y< -3.3&&y> -6.95)
    return 167;
 }
 return 255;
}
let shared:THREE.DataTexture|undefined;
export function g36PixelAtlas():THREE.DataTexture{
 if(shared)return shared;
 const width=TILE*COLS,height=TILE*ROWS;
 const data=new Uint8Array(width*height*4);
 for(const [name,def] of Object.entries(definitions) as [Tile,typeof definitions[Tile]][]){
  const [x0,x1,y0,y1]=def.bounds;
  for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
   const px=x0+(x+.5)/TILE*(x1-x0),py=y0+(y+.5)/TILE*(y1-y0);
   const shade=ink(name,px,py);
   const i=((def.row*TILE+y)*width+def.col*TILE+x)*4;
   data[i]=shade;data[i+1]=shade;data[i+2]=shade;data[i+3]=255;
  }
 }
 const tex=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.name='G36 D1 exterior graphic atlas';
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.magFilter=tex.minFilter=THREE.NearestFilter;
 tex.generateMipmaps=false;tex.flipY=false;tex.needsUpdate=true;
 shared=tex;
 return tex;
}
const cached=new WeakMap<THREE.Material,THREE.Material>();
function mappedMaterial(source:THREE.Material):THREE.Material{
 let found=cached.get(source);
 if(found)return found;
 if(!(source instanceof THREE.MeshStandardMaterial))return source;
 const clone=source.clone();
 clone.map=g36PixelAtlas();
 clone.userData={...source.userData,g36PixelMarks:true};
 clone.needsUpdate=true;
 cached.set(source,clone);
 return clone;
}
const tileFor=(region:Region,sign:number):Tile=>
 (region+(sign>0?'-right':'-left')) as Tile;
function uv(tile:Tile,x:number,y:number):readonly [number,number]{
 const t=definitions[tile],b=t.bounds;
 const u=Math.max(.004,Math.min(.996,(x-b[0])/(b[1]-b[0])));
 const v=Math.max(.004,Math.min(.996,(y-b[2])/(b[3]-b[2])));
 return [(t.col+u)/COLS,(t.row+v)/ROWS];
}
/** Per-mesh projection is run once on FIRST factory detail application.
 * Handguard's intentional indexed octagonal station geometry is expanded
 * once to allow independent UVs on the side/chamfer triangles. Triangle
 * count and the number of meshes/material roles do not increase.
 */
export function applyG36PixelDetails(root:THREE.Group):void{
 const configs:readonly {key:string;region:Region}[]=[
  {key:'g36LongHandguard',region:'guard'},
  {key:'g36ReceiverUpper',region:'receiver'},
  {key:'g36ReceiverLower',region:'lower'},
  {key:'g36Magazine',region:'magazine'}
 ];
 for(const {key,region} of configs){
  const mesh=root.children.find(n=>n instanceof THREE.Mesh&&n.userData[key]);
  if(!(mesh instanceof THREE.Mesh))throw Error('Missing G36 authored graphic surface '+key);
  if(!mesh.userData.g36AtlasProjected){
   const old=mesh.geometry as THREE.BufferGeometry;
   if(old.getIndex()){
    mesh.geometry=old.toNonIndexed();old.dispose();
   }
   const geom=mesh.geometry as THREE.BufferGeometry;
   const pos=geom.getAttribute('position');
   if(pos.count%3!==0)throw Error('G36 atlas requires triangle-list geometry');
   const coords=new Float32Array(pos.count*2);
   const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),
    u=new THREE.Vector3(),v=new THREE.Vector3(),normal=new THREE.Vector3();
   for(let i=0;i<pos.count;i+=3){
    a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,i+1);
    c.fromBufferAttribute(pos,i+2);
    normal.crossVectors(u.subVectors(b,a),v.subVectors(c,a)).normalize();
    const selected=Math.abs(normal.z)>.72?tileFor(region,normal.z):null;
    for(let j=0;j<3;j++){
     const x=pos.getX(i+j),y=pos.getY(i+j);
     const tile=selected??tileFor(region,normal.z>=0?1:-1);
     const [uu,vv]=uv(tile,x,y);
     coords[(i+j)*2]=uu;coords[(i+j)*2+1]=vv;
    }
    // Non-side faces should remain neutral, without accidental stretched art.
    if(!selected)for(let j=0;j<3;j++){
     // Rather than sample an arbitrary corner of an illustrated tile,
     // use its verified blank upper-right texel.
     const tile=definitions[tileFor(region,normal.z>=0?1:-1)];
     coords[(i+j)*2]=(tile.col+.985)/COLS;
     coords[(i+j)*2+1]=(tile.row+.985)/ROWS;
    }
   }
   geom.setAttribute('uv',new THREE.BufferAttribute(coords,2));
   mesh.userData.g36AtlasProjected=true;
   mesh.userData.g36AtlasRegion=region;
  }
  mesh.material=mappedMaterial(mesh.material as THREE.Material);
 }
}
export function g36PixelAtlasLayout(){
 return {width:TILE*COLS,height:TILE*ROWS,sideTiles:Object.keys(definitions),
  ventsPerSide:4,magRibsPerSide:3,rightReceiverEjectionOnly:true};
}
