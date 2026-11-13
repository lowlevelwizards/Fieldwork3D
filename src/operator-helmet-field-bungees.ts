/** H9.4c: actual helmet-conforming elastic NVG retention.
 * Two shallow, tensioned cords per helmet, each with its own rail hook,
 * a small fabric keeper at the corner, and a forward metal hook near
 * the NVG shroud. All path geometry is baked once; no frame-time rays.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';

type R='front'|'left'|'right';
const finite=(v:THREE.Vector3)=>Number.isFinite(v.x+v.y+v.z);
function point(shell:AchMichCoverShell,region:R,u:number,v:number,offset:number){
 // Retention is on the actual cloth, not inside the helmet. Keep
 // anchors near their authored location rather than teleporting
 // through the MICH-2002 ear window to the opposite side.
 for(const uv of [u,u*.90,u*.80])
  for(const vv of [v,v+.11,v-.11,v+.20,v-.20,.40]){
   const f=sampleHelmetCover(shell,region,uv,Math.min(.78,Math.max(-.62,vv)),offset);
   if(f)return f;
  }
 throw Error('H9.4c cannot place '+shell+' '+region+' elastic');
}
const add=(g:THREE.Group,name:string,material:THREE.Material,
 geometry:THREE.BufferGeometry,position:THREE.Vector3)=>{
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name;mesh.position.copy(position);
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);return mesh;
};
const orient=(mesh:THREE.Mesh,f:HelmetSurfaceFrame)=>{
 mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(f.right,f.up,f.normal));
};
function tether(shell:AchMichCoverShell,side:'left'|'right',g:THREE.Group,
 webbing:THREE.Material,metal:THREE.Material,dark:THREE.Material){
 const sign=side==='left'?-1:1;
 const rail=point(shell,side,-.63,.30,.76);
 const shoulder=point(shell,side,-.79,.40,.88);
 const corner=point(shell,'front',sign*.84,.31,.91);
 const front=point(shell,'front',sign*.52,.29,.82);
 const shroud=point(shell,'front',sign*.29,.24,.73);
 // A polyline along the shell's exterior, NOT a chord through the
 // front/side corner. A short soft curve removes sharp wire knees.
 const path=[rail.position,shoulder.position,corner.position,
  front.position,shroud.position];
 const curve=new THREE.CatmullRomCurve3(path,false,'centripetal',.22);
 const coords=curve.getPoints(30);
 // The round low-poly cord stays outside the cloth at every sampled
 // attachment point and floats above the face just enough to avoid
 // texture z-fighting.
 add(g,'bungee-elastic-'+side,webbing,
  new THREE.TubeGeometry(curve,30,.145,6,false),new THREE.Vector3());
 // Visible cylindrical stiff sleeves keep the cord anchored at each end.
 for(const [name,f] of [
  ['bungee-rail-sleeve',rail],['bungee-nvg-sleeve',shroud]
 ] as const){
  const sleeve=add(g,name,dark,new THREE.CylinderGeometry(.18,.18,.36,6),
   f.position);
  orient(sleeve,f);
  sleeve.rotation.z+=Math.PI/2;
 }
 // Flat bent hooks at rail and bracket: unmistakable attachment
 // hardware without creating tiny floating black specks.
 for(const [name,f] of [
  ['bungee-arc-retention-hook',rail],
  ['bungee-shroud-retention-hook',shroud]
 ] as const){
  const hook=add(g,name,metal,new THREE.BoxGeometry(.39,.14,.14),
   f.position.clone().addScaledVector(f.normal,.15));
  orient(hook,f);
 }
 if(!coords.every(finite))throw Error('H9.4c invalid '+shell+' '+side+' tether');
 return {
  side,
  path:path.map(p=>p.toArray()),
  surfaceAnchors:[rail.position.toArray(),shroud.position.toArray()],
  first:rail.position.toArray(),
  last:shroud.position.toArray(),
  segmentCount:30
 };
}
export function addAchMichRetainingBungees(
 shell:AchMichCoverShell,g:THREE.Group,
 elastic:THREE.Material,metal:THREE.Material,dark:THREE.Material
):void{
 const routes=[];for(const side of ['left','right'] as const)
  routes.push(tether(shell,side,g,elastic,metal,dark));
 g.userData.h9SurfaceMounted=true;
 g.userData.h10BungeeThickness=.145;
 g.userData.h9BungeeCordCount=2;
 g.userData.h9BungeeHooks=4;
 g.userData.h9BungeeRoutes=routes;
}
