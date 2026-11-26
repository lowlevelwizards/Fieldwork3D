/** WA6.2 AR-only visual surface art. Reuse the existing symbolic exterior
 * contour and press-line artwork, replacing decorative extruded overlays
 * with one opaque atlas on the original mesh. No simulation data. */
import * as THREE from 'three';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines,type ARMagazineCurve,type Point2} from './ar-magazine-profiles.ts';
import {createIntegratedArtAtlas,integratedArtUV,createIntegratedArtMaterialCache,type ArtTile} from './weapon-integrated-surface-atlas.ts';
const grid={tile:64,cols:3,rows:1};
const tiles={short:{col:0,row:0,bounds:[0,1,0,1]},long:{col:1,row:0,bounds:[0,1,0,1]},blank:{col:2,row:0,bounds:[0,1,0,1]}} as const satisfies Record<string,ArtTile>;
function extents(curve:ARMagazineCurve){
 const outline=arMagazineOutline(curve);
 return {minX:Math.min(...outline.map(p=>p[0])),maxX:Math.max(...outline.map(p=>p[0])),
  minY:Math.min(...outline.map(p=>p[1])),maxY:Math.max(...outline.map(p=>p[1]))};
}
function normalized(curve:ARMagazineCurve){
 const b=extents(curve);
 return (x:number,y:number):Point2=>[(x-b.minX)/(b.maxX-b.minX),(y-b.minY)/(b.maxY-b.minY)];
}
const patterns=Object.fromEntries((['20','30'] as const).map(style=>{
 const c=arMagazineCurve(style),norm=normalized(c);
 return [style==='20'?'short':'long',arMagazineRibOutlines(c).map(poly=>poly.map(([x,y])=>norm(x,y)))];
})) as Record<'short'|'long',Point2[][]>;
function inside(p:Point2,poly:Point2[]){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [x,y]=poly[i],[a,b]=poly[j];
  if((y>p[1])!==(b>p[1])&&p[0]<(a-x)*(p[1]-y)/(b-y)+x)hit=!hit;
 }
 return hit;
}
let atlas:THREE.DataTexture|undefined;
export function arMagazineGraphicAtlas(){
 return atlas??=createIntegratedArtAtlas('AR WA6 opaque exterior press-line art',grid,tiles,
  (tile,x,y)=>tile==='blank'?255:patterns[tile].some(poly=>inside([x,y],poly))?168:255);
}
const mapped=createIntegratedArtMaterialCache(arMagazineGraphicAtlas,'arWA6IntegratedMagazineArt');
export function applyARMagazineGraphic(mesh:THREE.Mesh,curve:ARMagazineCurve){
 if(curve.style==='poly'||Array.isArray(mesh.material))return;
 const pos=mesh.geometry.getAttribute('position'),normal=mesh.geometry.getAttribute('normal');
 if(!normal||normal.count!==pos.count)throw Error('AR art requires face normals');
 const norm=normalized(curve),uv=new Float32Array(pos.count*2);
 for(let i=0;i<pos.count;i++){
  const [x,y]=norm(pos.getX(i),pos.getY(i));
  const tile=Math.abs(normal.getZ(i))>.99?tiles[curve.style==='20'?'short':'long']:tiles.blank;
  const pair=integratedArtUV(tile,grid,x,y,.5/grid.tile);
  uv[i*2]=pair[0];uv[i*2+1]=pair[1];
 }
 mesh.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 mesh.material=mapped(mesh.material);
 mesh.userData.arWA6IntegratedMagazineArt=true;
 mesh.userData.arGraphicDetailTier=3;
}
