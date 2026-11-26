/** P21: FNC-specific pixel-art surface markings, zero overlay meshes.
 * A single immutable RGBA8 atlas is UV projected onto existing exterior
 * faces, keeping all factory finishes, shadowing, and geometry unchanged.
 * Positions are weapon-local game-art coordinates, never physical dimensions.
 */
import * as THREE from 'three';
import {createIntegratedArtAtlas,integratedArtUV,createIntegratedArtMaterialCache} from './weapon-integrated-surface-atlas.ts';
import {FNC_FRONT_P13 as F} from './fnc-front-layout.ts';

export type FNCPixelRegion='receiver-upper'|'receiver-lower'|'polymer'|'gas';
type Tile='slot'|'lower-right'|'lower-left'|'gas-side'|'gas-roof'|'polymer'|'blank';
type Bounds=readonly [number,number,number,number];
const TILE=128,COLS=4,ROWS=2;
const TILES:Readonly<Record<Tile,{col:number;row:number;bounds:Bounds}>>={
 'slot':{col:0,row:0,bounds:[-6.40,2.80,-1.20,1.60]},
 'lower-right':{col:1,row:0,bounds:[-6.40,2.80,-3.60,-1.00]},
 'lower-left':{col:2,row:0,bounds:[-6.40,2.80,-3.60,-1.00]},
 'gas-side':{col:3,row:0,bounds:[F.gas.startX,F.gas.endX,F.gas.frontBottomY,F.gas.topY]},
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
  if(inside(x,y,-1.22,.68,-.55,.17)||
     inside(x,y,.68,2.55,-.05,.20))return 108;
  return 255;
 }
 if(tile==='lower-right'||tile==='lower-left'){
  if(inside(x,y,-6.19,2.68,-1.37,-1.22))return 139;
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
  // Two front-gas-block markings now use the exact same length and
  // cross-face thickness as the 4+4+4 vents; only shade differs.
  // All remain authored pixels on the original mesh, never extra quads.
  if(tile==='gas-side')for(const line of F.gas.lowerLines){
   if(inside(x,y,line.startX,line.endX,
    line.y-F.gas.ventHeight/2,line.y+F.gas.ventHeight/2))return line.shade;
  }
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
const grid={tile:TILE,cols:COLS,rows:ROWS};
let shared:THREE.DataTexture|undefined;
export function fncPixelAtlas():THREE.DataTexture{
 return shared??=createIntegratedArtAtlas('FNC P21 authored pixel-surface atlas',grid,TILES,pixelValue);
}
const pixelMaterial=createIntegratedArtMaterialCache(fncPixelAtlas,'fncPixelArt',{allowBasic:true});
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
 return integratedArtUV(TILES[tile],grid,x,y,.005);
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
 // A4.7: integrated surface details share the same cross-family audit
 // contract without adding an overlay or cloning a material per weapon.
 mesh.userData.surfaceDetailClass='fnc-integrated-atlas';
 mesh.userData.surfaceDetailFace=region==='receiver-upper'?'right':
  region==='gas'?'faceted':'both';
 if(region==='gas'){
  mesh.userData.fncPixelVentCounts={left:4,right:4,top:4};
  mesh.userData.fncPixelLowerGasLines=F.gas.lowerLines.length;
 }
 if(region==='polymer')mesh.userData.fncPixelGroovesPerSide=2;
 if(region==='receiver-upper')mesh.userData.fncPixelOperatingSlot=true;
 if(region==='receiver-lower')mesh.userData.fncPixelReceiverLines=true;
}
/** Read-only metadata for geometry/render regression tests. */
export function fncPixelAtlasLayout(){return {tilePixels:TILE,width:TILE*COLS,
 height:TILE*ROWS,regions:Object.keys(TILES)};}
