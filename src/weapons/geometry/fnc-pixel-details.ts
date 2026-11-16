/** P21: FNC-specific pixel-art surface markings, zero overlay meshes.
 * A single immutable RGBA8 atlas is UV projected onto existing exterior
 * faces, keeping all factory finishes, shadowing, and geometry unchanged.
 * Positions are weapon-local game-art coordinates, never physical dimensions.
 */
import * as THREE from 'three';
import {FNC_FRONT_P13 as F} from './fnc-front-layout.ts';

export type FNCPixelRegion='receiver-upper'|'receiver-lower'|'polymer'|'gas';
type Tile='slot'|'lower-right'|'lower-left'|'gas-side'|'gas-roof'|'polymer'|'blank';
type Bounds=readonly [number,number,number,number];
const TILE=128,COLS=4,ROWS=2;
const TILES:Readonly<Record<Tile,{col:number;row:number;bounds:Bounds}>>={
 'slot':{col:0,row:0,bounds:[-6.40,2.80,-1.20,1.95]},
 'lower-right':{col:1,row:0,bounds:[-6.40,2.80,-3.60,-1.00]},
 'lower-left':{col:2,row:0,bounds:[-6.40,2.80,-3.60,-1.00]},
 'gas-side':{col:3,row:0,bounds:[F.gas.startX,F.gas.endX,F.gas.bottomY,F.gas.topY]},
 'gas-roof':{col:0,row:1,bounds:[F.gas.startX,F.gas.endX,-F.gas.roofHalfZ,F.gas.roofHalfZ]},
 'polymer':{col:1,row:1,bounds:[F.polymer.startX,F.polymer.endX,-2.80,.70]},
 'blank':{col:2,row:1,bounds:[0,1,0,1]}
};
const inside=(x:number,y:number,x0:number,x1:number,y0:number,y1:number)=>
 x>=x0&&x<=x1&&y>=y0&&y<=y1;
const polymerY=(v:number)=>{
 const p=F.polymer,yy=p.pivotY+(v-p.pivotY)*p.heightScale+p.liftY;
 return yy+Math.min(0,yy+1)*p.lowerFlare;
};
/** Authored blocky marks: white is inert; shaded texels tint the native steel
 * or polymer material, rather than introducing lit floating rectangles.
 */
function pixelValue(tile:Tile,x:number,y:number):number{
 if(tile==='slot'){
  // Rear opening and its continuous, narrower forward charging track.
  if(inside(x,y,-1.22,.68,-.20,.60)||
     inside(x,y,.68,2.55,.29,.60))return 108;
  return 255;
 }
 if(tile==='lower-right'||tile==='lower-left'){
  if(inside(x,y,-6.19,2.68,-1.37,-1.22))return 139;
  if(tile==='lower-right'&&inside(x,y,-5.83,-.96,-2.25,-2.10))
   return 174;
  return 255;
 }
 if(tile==='polymer'){
  for(const guide of F.polymer.grooveYs){
   const yy=polymerY(guide);
   if(inside(x,y,F.polymer.grooveStartX,F.polymer.grooveEndX,
     yy-.115,yy+.115))return 154;
  }
  return 255;
 }
 if(tile==='gas-side'||tile==='gas-roof'){
  for(let i=0;i<F.gas.ventCount;i++){
   const x0=F.gas.ventFirstX+i*F.gas.ventPitch;
   if(tile==='gas-side'&&inside(x,y,x0,x0+F.gas.ventLength,
     F.gas.ventSideYs[0]-F.gas.ventHeight/2,
     F.gas.ventSideYs[0]+F.gas.ventHeight/2))return 114;
   if(tile==='gas-roof'&&inside(x,y,x0,x0+F.gas.ventLength,
     -F.gas.ventRoofHalfZ,F.gas.ventRoofHalfZ))return 114;
  }
 }
 return 255;
}
let shared:THREE.DataTexture|undefined;
export function fncPixelAtlas():THREE.DataTexture{
 if(shared)return shared;
 const width=TILE*COLS,height=TILE*ROWS,rgba=new Uint8Array(width*height*4);
 for(const [name,definition] of Object.entries(TILES) as [Tile,typeof TILES[Tile]][]){
  const [x0,x1,y0,y1]=definition.bounds;
  for(let j=0;j<TILE;j++)for(let i=0;i<TILE;i++){
   const x=x0+(i+.5)/TILE*(x1-x0),y=y0+(j+.5)/TILE*(y1-y0);
   const shade=pixelValue(name,x,y);
   const n=((definition.row*TILE+j)*width+definition.col*TILE+i)*4;
   rgba[n]=shade;rgba[n+1]=shade;rgba[n+2]=shade;rgba[n+3]=255;
  }
 }
 const atlas=new THREE.DataTexture(rgba,width,height,
  THREE.RGBAFormat,THREE.UnsignedByteType);
 atlas.name='FNC P21 authored pixel-surface atlas';
 atlas.colorSpace=THREE.SRGBColorSpace;
 atlas.wrapS=atlas.wrapT=THREE.ClampToEdgeWrapping;
 atlas.magFilter=atlas.minFilter=THREE.NearestFilter;
 atlas.generateMipmaps=false;
 atlas.flipY=false;
 atlas.needsUpdate=true;
 shared=atlas;
 return atlas;
}
const materials=new WeakMap<THREE.Material,THREE.Material>();
function pixelMaterial(source:THREE.Material):THREE.Material{
 let material=materials.get(source);
 if(material)return material;
 // The production palette is standard PBR; isolated labs use Basic.
 // Preserve the original material type and all non-pixel finish settings.
 if(!(source instanceof THREE.MeshStandardMaterial) &&
    !(source instanceof THREE.MeshBasicMaterial))return source;
 material=source.clone();
 material.map=fncPixelAtlas();
 material.userData={...source.userData,fncPixelArt:true};
 material.needsUpdate=true;
 materials.set(source,material);
 return material;
}
function tileFor(region:FNCPixelRegion,n:THREE.Vector3):Tile{
 if(region==='gas'){
  if(n.y>.65)return 'gas-roof';
  return Math.abs(n.z)>.40?'gas-side':'blank';
 }
 if(Math.abs(n.z)<.45)return 'blank';
 if(region==='polymer')return 'polymer';
 if(region==='receiver-lower')return n.z>0?'lower-right':'lower-left';
 return n.z>0?'slot':'blank';
}
function uvFor(tile:Tile,x:number,y:number):[number,number]{
 const {col,row,bounds}=TILES[tile];
 const [x0,x1,y0,y1]=bounds;
 const u=Math.max(.005,Math.min(.995,(x-x0)/(x1-x0)));
 const v=Math.max(.005,Math.min(.995,(y-y0)/(y1-y0)));
 return [(col+u)/COLS,(row+v)/ROWS];
}
/** Assign atlas UVs triangle-by-triangle. Existing FNC meshes have
 * independent triangle vertices, so no extra triangles/vertices are added.
 * End caps and underside faces map to the solid white atlas tile.
 */
export function applyFNCPixelDetails(mesh:THREE.Mesh,region:FNCPixelRegion):void{
 const geo=mesh.geometry as THREE.BufferGeometry,position=geo.getAttribute('position');
 if(geo.getIndex())throw new Error('FNC pixel-art UV projection expects nonindexed triangles');
 const data=new Float32Array(position.count*2),a=new THREE.Vector3(),
  b=new THREE.Vector3(),c=new THREE.Vector3(),
  ab=new THREE.Vector3(),ac=new THREE.Vector3(),normal=new THREE.Vector3();
 for(let i=0;i<position.count;i+=3){
  a.fromBufferAttribute(position,i);
  b.fromBufferAttribute(position,i+1);
  c.fromBufferAttribute(position,i+2);
  ab.subVectors(b,a);ac.subVectors(c,a);
  normal.crossVectors(ab,ac).normalize();
  const tile=tileFor(region,normal);
  for(let j=0;j<3;j++){
   const x=position.getX(i+j),y=region==='gas'&&tile==='gas-roof'?
    position.getZ(i+j):position.getY(i+j);
   const [u,v]=uvFor(tile,x,y);
   data[(i+j)*2]=u;data[(i+j)*2+1]=v;
  }
 }
 geo.setAttribute('uv',new THREE.BufferAttribute(data,2));
 mesh.material=pixelMaterial(mesh.material as THREE.Material);
 mesh.userData.fncPixelDetailRegion=region;
 mesh.userData.fncPixelAtlas=fncPixelAtlas().name;
 if(region==='gas')mesh.userData.fncPixelVentCounts={left:4,right:4,top:4};
 if(region==='polymer')mesh.userData.fncPixelGroovesPerSide=2;
 if(region==='receiver-upper')mesh.userData.fncPixelOperatingSlot=true;
 if(region==='receiver-lower')mesh.userData.fncPixelReceiverLines=true;
}
/** Read-only metadata for geometry/render regression tests. */
export function fncPixelAtlasLayout(){return {tilePixels:TILE,width:TILE*COLS,
 height:TILE*ROWS,regions:Object.keys(TILES)};}
