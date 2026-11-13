/** H9.3 — fitted six-cord diagonal ACH/MICH helmet net.
 * Build once against the authored cover geometry; no per-frame sampling.
 * Six broad diagonal routes cross the crown and descend along the real
 * front, back and side drape before tucking beneath the retaining band.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,type CoverRegion,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {achMichProfile,achMichHemY} from './operator-ach-mich-details.ts';

type Pt={position:THREE.Vector3;normal:THREE.Vector3};
type Edge={x:number;z:number};
const ROOF_X=3.15,ROOF_Z=3.52;
const WIDTH=.18;
const mat=(p:HelmetSurfaceFrame):Pt=>({
 position:p.position.clone(),normal:p.normal.clone()
});
const clip=(slope:number,shift:number):[Edge,Edge]=>{
 const hits:Edge[]=[];
 for(const x of [-ROOF_X,ROOF_X]){
  const z=slope*x+shift;
  if(z>=-ROOF_Z-1e-6&&z<=ROOF_Z+1e-6)hits.push({x,z});
 }
 for(const z of [-ROOF_Z,ROOF_Z]){
  const x=(z-shift)/slope;
  if(x>=-ROOF_X-1e-6&&x<=ROOF_X+1e-6)hits.push({x,z});
 }
 if(hits.length<2)throw Error('H9.3 diagonal does not cross crown');
 hits.sort((a,b)=>a.x-b.x);
 return [hits[0],hits[hits.length-1]];
};
const roof=(shell:AchMichCoverShell,x:number,z:number):Pt=>{
 const sample=sampleHelmetCover(shell,'crown',x/3.4,z/3.8,.205);
 if(!sample)throw Error('H9.3 missing roof point '+shell+' '+x+','+z);
 return mat(sample);
};
function sideRegion(edge:Edge):{region:Exclude<CoverRegion,'crown'>;u:number}{
 if(Math.abs(Math.abs(edge.x)-ROOF_X)<.001)
  return {region:edge.x<0?'left':'right',u:edge.z/4.4};
 return {region:edge.z<0?'front':'back',u:edge.x/4.3};
}
const side=(shell:AchMichCoverShell,edge:Edge,v:number,offset=.16):Pt=>{
 const {region,u}=sideRegion(edge);
 const sample=sampleHelmetCover(shell,region,u,v,offset);
 if(!sample)throw Error('H9.3 missing '+region+' drape point '+shell);
 return mat(sample);
};
/** Find the retaining-band height from actual hem/profile dimensions.
 * Avoid probing above or below the cloth: a ray at an unsupported height
 * returns null and previously made the entire helmet fail to construct.
 */
const bandV=(shell:AchMichCoverShell,edge:Edge):number=>{
 const p=HELMET_MOUNT_PROFILES[shell],r=sideRegion(edge);
 const profile=achMichProfile(shell);
 const bottom=r.region==='front'?profile.brow:
  r.region==='back'?profile.nape:achMichHemY(shell,r.u*4.4);
 const target=Math.max(bottom+.50,Math.min(p.top-.85,p.top-2.39));
 const span=Math.max(1,p.top-bottom-.45);
 return Math.max(-.65,Math.min(.48,
  2*(target-bottom-.38)/span-1));
};
function route(shell:AchMichCoverShell,slope:number,shift:number){
 const [a,b]=clip(slope,shift);
 const crown:Pt[]=[];
 for(let i=0;i<=8;i++){
  const t=i/8;
  crown.push(roof(shell,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t));
 }
 const aTie=bandV(shell,a),bTie=bandV(shell,b);
 const points:Pt[]=[
  side(shell,a,aTie,.048),side(shell,a,(aTie+.72)*.5),
  side(shell,a,.72),...crown,
  side(shell,b,.72),side(shell,b,(bTie+.72)*.5),
  side(shell,b,bTie,.048)
 ];
 return {points,ends:[a,b],tieY:[
  points[0].position.y,points[points.length-1].position.y
 ]};
}
/** Surface-aligned two-triangle strip along each adjacent span.
 * Keep geometry narrow so it reads as cord instead of H8's roof beams.
 */
function appendStrip(out:number[],path:Pt[]):void{
 const put=(v:THREE.Vector3)=>out.push(v.x,v.y,v.z);
 for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1];
  const along=b.position.clone().sub(a.position).normalize();
  const n=a.normal.clone().add(b.normal).normalize();
  const across=new THREE.Vector3().crossVectors(n,along).normalize()
   .multiplyScalar(WIDTH*.5);
  const p=a.position.clone().sub(across),q=a.position.clone().add(across);
  const r=b.position.clone().add(across),s=b.position.clone().sub(across);
  for(const v of [p,q,r,p,r,s])put(v);
 }
}
export function createAchMichFieldNetGeometry(
 shell:AchMichCoverShell
):THREE.BufferGeometry{
 const vertices:number[]=[],routes=[];
 for(const slope of [-.78,.82])
  for(const shift of [-2.75,.16,2.84]){
   const path=route(shell,slope,shift);
   appendStrip(vertices,path.points);
   routes.push({
    slope,shift,
    endpoints:path.ends,
    ties:path.tieY,
    crown:path.points.slice(3,-3).map(p=>p.position.toArray())
   });
  }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.h9NetCordCount=6;
 g.userData.h9NetPattern='sparse-diamond';
 g.userData.h9NetWrapped=true;
 g.userData.h9NetUnderBand=true;
 g.userData.h9NetRoutes=routes;
 return g;
}
