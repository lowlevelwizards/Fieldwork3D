/** H12: bold, corner-safe NVG bungees.
 * Five intentional perimeter stations and four ribbon quads per side.
 * No 30-segment tubes, curve interpolation, cylindrical sleeves or runtime
 * surface probes. Separate covered/bare routes are built once.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {ACH_MICH_COVER_OFFSET} from './operator-ach-mich-cover-drape.ts';
import {achMichProfile} from './operator-ach-mich-details.ts';
import {sampleHelmetCover,sampleHelmetShell} from './operator-helmet-surface.ts';

const ribbon=(path:readonly THREE.Vector3[]):THREE.BufferGeometry=>{
 const positions:number[]=[];
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];
  // Flat, broad elastic; 2 triangles per manufactured segment.
  // Always width-aligned vertically so it stays outside the upper shell.
  const width=.15;
  const aa=a.clone().add(new THREE.Vector3(0,width,0));
  const ab=a.clone().add(new THREE.Vector3(0,-width,0));
  const ba=b.clone().add(new THREE.Vector3(0,width,0));
  const bb=b.clone().add(new THREE.Vector3(0,-width,0));
  for(const p of [aa,ab,bb,aa,bb,ba])
   positions.push(p.x,p.y,p.z);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.h12FlatElastic=true;
 g.userData.h12SegmentCount=path.length-1;
 return g;
};
const add=(g:THREE.Group,name:string,material:THREE.Material,
 geometry:THREE.BufferGeometry)=>{
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;
 g.add(mesh);return mesh;
};
function tether(shell:AchMichCoverShell,side:'left'|'right',root:THREE.Group,
 elastic:THREE.Material,metal:THREE.Material,covered:boolean){
 const sign=side==='left'?-1:1,p=achMichProfile(shell);
 const layer=covered?ACH_MICH_COVER_OFFSET:0;
 const rail=covered?
  sampleHelmetCover(shell,side,-.51,.43,.42):
  sampleHelmetShell(shell,side,-.51,.43,.42);
 if(!rail)throw Error('H12 no bungee rail anchor '+shell+' '+side);
 // The entire side run is OUTSIDE the outer side wall. The elbow itself
 // is outside BOTH the side and front planes, so neither diagonal can cut
 // through the sharp ACH/MICH helmet corner.
 const sideX=sign*Math.max(Math.abs(rail.position.x),p.side+layer+.44);
 const frontZ=p.front-layer-.44;
 const y=rail.position.y;
 const path=[
  new THREE.Vector3(sideX,y,rail.position.z),
  new THREE.Vector3(sideX,y+.06,(rail.position.z+frontZ)*.50),
  new THREE.Vector3(sideX,y+.08,frontZ),
  new THREE.Vector3(sign*3.22,y+.06,frontZ),
  new THREE.Vector3(sign*1.62,y+.04,frontZ)
 ];
 add(root,'bungee-flat-elastic-'+side,elastic,ribbon(path));
 // Two broad flat retention hooks replace four cylinders and sleeves.
 // These are only cosmetic; they share the same static local route.
 const hookGeometry=new THREE.BoxGeometry(.40,.30,.15);
 for(const [index,point] of [[0,path[0]],[4,path[4]]] as const){
  const hook=add(root,index===0?'bungee-rail-hook':'bungee-shroud-hook',
   metal,hookGeometry);
  hook.position.copy(point);
 }
 return {
  side,path:path.map(v=>v.toArray()),
  surfaceAnchors:[path[0].toArray(),path[4].toArray()],
  first:path[0].toArray(),last:path[4].toArray(),
  segmentCount:4,cornerX:sideX,cornerZ:frontZ,
  covered
 };
}
export function addAchMichRetainingBungees(
 shell:AchMichCoverShell,g:THREE.Group,
 elastic:THREE.Material,metal:THREE.Material,_dark:THREE.Material
):void{
 const cover=new THREE.Group(),bare=new THREE.Group();
 cover.name='bungee-cover-route';bare.name='bungee-bare-route';
 cover.visible=true;bare.visible=false;g.add(cover,bare);
 const routes=[],bareRoutes=[];
 for(const side of ['left','right'] as const){
  routes.push(tether(shell,side,cover,elastic,metal,true));
  bareRoutes.push(tether(shell,side,bare,elastic,metal,false));
 }
 g.userData.h9SurfaceMounted=true;
 g.userData.h10BungeeThickness=.15;
 g.userData.h9BungeeCordCount=2;
 g.userData.h9BungeeHooks=4;
 g.userData.h5CloserSurfaceFit=true;
 g.userData.h61CoverAwareTethers=true;
 g.userData.h67LowClearanceRoute=true;
 g.userData.h9BungeeRoutes=routes;
 g.userData.h12BareBungeeRoutes=bareRoutes;
 g.userData.h12NoTubeGeometry=true;
 g.userData.h12ElbowBeyondShell=true;
}
