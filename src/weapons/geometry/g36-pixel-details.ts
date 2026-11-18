/** G36 P8: game-scale identity marks in a single shared 384x192 atlas:
 * four fore-end vents and a one-sided ejection port; solid magazine finish.
 * No added overlays, side mirrored ejection details, geometry count changes,
 * transparency, per-frame materials, per-instance texture uploads or shaders.
 * The same live-intended original G36 meshes are UV projected in place.
 */
import * as THREE from 'three';
import {G36_H3_VENT_CENTERS,G36_H3_VENT_SIZE}
 from './g36-h3-handguard.ts';
type Region='guard'|'receiver'|'lower'|'magazine'|'muzzle';
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
 'magazine-right':{col:2,row:1,bounds:[-1.35,3.30,-8.42,-2.60]},
 'magazine-left':{col:3,row:1,bounds:[-1.35,3.30,-8.42,-2.60]}
};
const between=(v:number,a:number,b:number)=>v>=a&&v<=b;
const zone=(x:number,y:number,x0:number,x1:number,y0:number,y1:number)=>
 between(x,x0,x1)&&between(y,y0,y1);
/** Art-only marks (no simulated mechanism). White retains the factory
 * material and lighting. A port belongs on ONE exterior side only.
 */
function ink(tile:Tile,x:number,y:number):number{
 if(tile==='guard-right'||tile==='guard-left'){
  // Four unchanged large graphic side vents; no vent geometry.
  const halfLength=G36_H3_VENT_SIZE.length/2;
  const middle=G36_H3_VENT_SIZE.centerY;
  const halfHeight=G36_H3_VENT_SIZE.height/2;
  for(const center of G36_H3_VENT_CENTERS){
   if(zone(x,y,center-halfLength,center+halfLength,
    middle-halfHeight,middle+halfHeight))return 89;
  }
  return 255;
 }
 if(tile==='receiver-right'){
  // One major asymmetrical ejection landmark, never a traced mechanics kit.
  if(zone(x,y,-1.45,1.72,.03,.80))return 76;
  return 255;
 }
 if(tile==='receiver-left')return 255;
 if(tile==='lower-right'||tile==='lower-left'){
  // No selector dots, copied lower seams or hidden micro markings.
  return 255;
 }
 if(tile==='magazine-right'||tile==='magazine-left'){
  // R1: no large UV-projected interior bars or mismatched translucent-look
  // rectangles. Uniform unprinted opaque G36 smoky-polymer finish; the
  // physical magazine profile and single shared material carry the shape.
  return 255;
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
 // One reusable slightly dark front-cap swatch in the otherwise blank corner
 // of the guard atlas. No extra material, mesh, texture, or front cavity.
 const swatch=((2)*width+2)*4;
 data[swatch]=181;data[swatch+1]=181;data[swatch+2]=181;
 const tex=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
 tex.name='G36 P8 broad HK identity atlas';
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.magFilter=tex.minFilter=THREE.NearestFilter;
 tex.generateMipmaps=false;tex.flipY=false;tex.needsUpdate=true;
 shared=tex;
 return tex;
}
const cached=new WeakMap<THREE.Material,THREE.Material>();
function mappedMaterial(source:THREE.Material):THREE.Material{
 // Re-applying the factory details must NEVER clone a previously mapped
 // finish; the same decorated mesh may be previewed many times.
 if(source.userData.g36PixelMarks)return source;
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
 * Any indexed geometry is expanded once for independent face UVs. Triangle
 * count and the number of meshes/material roles do not increase.
 */
export function applyG36PixelDetails(root:THREE.Group):void{
 const configs:readonly {key:string;region:Region}[]=[
  {key:'g36LongHandguard',region:'guard'},
  {key:'g36ReceiverUpper',region:'receiver'},
  {key:'g36ReceiverLower',region:'lower'},
  {key:'g36Magazine',region:'magazine'},
  // Reuse two full-size guard vents as the flash-hider's longitudinal cuts.
  // No new atlas tile, texture allocation, mesh or separate decal.
  {key:'g36FactoryMuzzle',region:'muzzle'}
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
    const surfaceRegion=region==='muzzle'?'guard':region;
    const selected=Math.abs(normal.z)>.72?tileFor(surfaceRegion,normal.z):null;
    const solidFront=region==='guard'&&normal.x>.85;
    for(let j=0;j<3;j++){
     const x=pos.getX(i+j),y=pos.getY(i+j);
     const tile=selected??tileFor(surfaceRegion,normal.z>=0?1:-1);
     // Spread two existing big vent shapes across the slimmer device
     // using ONLY UVs. No modeling of tiny real-life flash-hider cuts.
     const tx=region==='muzzle'&&selected?
      5.45+(x-17.85)/(19.50-17.85)*3.95:x;
     const ty=region==='muzzle'&&selected?
      G36_H3_VENT_SIZE.centerY+y*.78:y;
     const [uu,vv]=uv(tile,tx,ty);
     coords[(i+j)*2]=uu;coords[(i+j)*2+1]=vv;
    }
    // All non-side faces remain plain, except the front's darker solid cap.
    // The slanted front is part of THIS SAME mesh, not an inset or overlay.
    if(solidFront)for(let j=0;j<3;j++){
     coords[(i+j)*2]=2.5/(COLS*TILE);
     coords[(i+j)*2+1]=2.5/(ROWS*TILE);
    }
    else if(!selected)for(let j=0;j<3;j++){
     // Rather than sample an arbitrary corner of an illustrated tile,
     // use its verified blank upper-right texel.
     const tile=definitions[tileFor(surfaceRegion,normal.z>=0?1:-1)];
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
  ventsPerSide:4,magRibsPerSide:0,rightReceiverEjectionOnly:true};
}
