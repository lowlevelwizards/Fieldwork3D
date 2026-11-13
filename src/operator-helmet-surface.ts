/** H9.1 static-only ACH/MICH textile attachment sampling.
 * Read the ACTUAL authored drape triangles instead of approximating the
 * surface from helmet-wide side/front/top extents. Resolve once when
 * assembling a helmet; never raycast during animation or wardrobe updates.
 */
import * as THREE from 'three';
import {createAchMichDrapedGeometry,type AchMichCoverShell}
 from './operator-ach-mich-cover-drape.ts';
import {achMichProfile,achMichHemY} from './operator-ach-mich-details.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
export type CoverRegion='front'|'back'|'left'|'right'|'crown';
export type HelmetSurfaceFrame={
 position:THREE.Vector3;
 normal:THREE.Vector3;
 right:THREE.Vector3;
 up:THREE.Vector3;
 region:CoverRegion;
};
const cache=new Map<AchMichCoverShell,THREE.Mesh>();
const material=new THREE.MeshBasicMaterial({
 side:THREE.DoubleSide,depthWrite:false
});
const clamped=(x:number)=>Math.max(-1,Math.min(1,x));
function cloth(shell:AchMichCoverShell):THREE.Mesh{
 let mesh=cache.get(shell);
 if(!mesh){
  mesh=new THREE.Mesh(createAchMichDrapedGeometry(shell),material);
  mesh.updateMatrixWorld(true);cache.set(shell,mesh);
 }
 return mesh;
}
/** u spans left/right on the front/rear or front/back on the sides.
 * v spans the available hem-to-crown height; crown uses u,v as roof XY.
 * null means no real cloth surface was hit: unsupported placement is not
 * silently teleported to an invented shell-wide attachment plane.
 */
export function sampleHelmetCover(
 shell:AchMichCoverShell,region:CoverRegion,u:number,v:number,
 clearance=.10
):HelmetSurfaceFrame|null{
 const profile=achMichProfile(shell),top=HELMET_MOUNT_PROFILES[shell].top;
 const uu=clamped(u),vv=clamped(v);
 const origin=new THREE.Vector3(),direction=new THREE.Vector3();
 if(region==='crown'){
  origin.set(uu*3.4,20,vv*3.8);direction.set(0,-1,0);
 }else if(region==='front'||region==='back'){
  const low=region==='front'?profile.brow:profile.nape;
  origin.set(uu*profile.side*.79,
   low+.38+(top-low-.45)*(vv+1)/2,
   region==='front'?-18:18);
  direction.set(0,0,region==='front'?1:-1);
 }else{
  const z=uu*(profile.rear-profile.front)*.40+
   (profile.front+profile.rear)*.50;
  const low=achMichHemY(shell,z);
  origin.set(region==='left'?-18:18,
   low+.38+(top-low-.45)*(vv+1)/2,z);
  direction.set(region==='left'?1:-1,0,0);
 }
 const caster=new THREE.Raycaster(origin,direction,0,35);
 const hit=caster.intersectObject(cloth(shell),false)[0];
 if(!hit?.face)return null;
 const normal=hit.face.normal.clone();
 // Raycasts on double-sided fabric may give reversed triangle winding.
 if(normal.dot(direction)>0)normal.negate();
 const up=new THREE.Vector3(0,1,0)
  .addScaledVector(normal,-normal.y);
 if(up.lengthSq()<.001)up.set(0,0,-1);
 up.normalize();
 const right=normal.clone().cross(up).normalize();
 return {
  position:hit.point.clone().addScaledVector(normal,clearance),
  normal,right,up,region
 };
}
