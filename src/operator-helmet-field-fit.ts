/** H10.0: the elastic band is fitted to the *actual* ACH/MICH drape.
 * No rectangular chord through the front corner and no world-horizontal
 * ribbon through high ear cuts. Geometry is built once per helmet family.
 */
import * as THREE from 'three';
import {sampleHelmetCover,sampleHelmetShell,type CoverRegion,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';

type Section={region:Exclude<CoverRegion,'crown'>;us:number[]};
const bandGeometryByShell=new Map<string,THREE.BufferGeometry>();
const sections:Section[]=[
 {region:'front',us:[-.96,-.70,-.42,-.14,.14,.42,.70,.96]},
 {region:'right',us:[-.96,-.70,-.42,-.14,.14,.42,.70,.96]},
 {region:'back',us:[.96,.70,.42,.14,-.14,-.42,-.70,-.96]},
 {region:'left',us:[.96,.70,.42,.14,-.14,-.42,-.70,-.96]}
];
/** Choose the real cover sample nearest the physical band height. */
function bandFrame(shell:AchMichCoverShell,region:Section['region'],
 u:number,target:number,covered:boolean):HelmetSurfaceFrame{
 let selected:HelmetSurfaceFrame|null=null,score=Infinity;
 for(const uu of [u,u*.94,u*.85])
  for(let i=0;i<=20;i++){
   const v=-.78+i*.078;
   const frame=covered?sampleHelmetCover(shell,region,uu,v,.20):
    sampleHelmetShell(shell,region,uu,v,.11);
   if(!frame)continue;
   const distance=Math.abs(frame.position.y-target)+Math.abs(uu-u)*.35;
   if(distance<score){score=distance;selected=frame;}
  }
 if(!selected)throw Error('H10 elastic has no '+region+' cover surface on '+shell);
 return selected;
}
export function createAchMichSurfaceBandGeometry(
 shell:AchMichCoverShell,covered=true):THREE.BufferGeometry{
 const key=shell+':'+(covered?'covered':'bare');
 const reused=bandGeometryByShell.get(key);
 if(reused)return reused;
 const frames:HelmetSurfaceFrame[]=[];
 const target=HELMET_MOUNT_PROFILES[shell].top-2.39;
 for(const section of sections)
  for(const u of section.us)
   frames.push(bandFrame(shell,section.region,u,target,covered));
 const verts:number[]=[];
 const edge=(f:HelmetSurfaceFrame,sign:number)=>f.position.clone()
  .addScaledVector(f.up,sign*.37);
 const put=(v:THREE.Vector3)=>verts.push(v.x,v.y,v.z);
 for(let i=0;i<frames.length;i++){
  const a=frames[i],b=frames[(i+1)%frames.length];
  const lo=edge(a,-1),hi=edge(a,1),nextLo=edge(b,-1),nextHi=edge(b,1);
  for(const p of [lo,hi,nextHi,lo,nextHi,nextLo])put(p);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 geometry.userData.h10BandSurfaceFitted=true;
 geometry.userData.h10BandClosed=true;
 geometry.userData.h10BandStations=frames.length;
 geometry.userData.h10BandTargetY=target;
 geometry.userData.h5SurfaceMode=covered?'cover':'shell';
 bandGeometryByShell.set(key,geometry);
 return geometry;
}
