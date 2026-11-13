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
   const frame=covered?sampleHelmetCover(shell,region,uu,v,.37):
    sampleHelmetShell(shell,region,uu,v,.29);
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
 // Ribbon edges must clear the shell too. Offsetting only the centerline
 // put the top and bottom halves back inside sloped facets.
 const edge=(f:HelmetSurfaceFrame,sign:number,corner:boolean)=>{
  const p=f.position.clone().addScaledVector(f.up,sign*.35)
   .addScaledVector(f.normal,.16);
  if(corner){
   // A straight chord between orthogonal panels cuts into the corner.
   // Pull the elbow outward so front/side/rear transitions remain proud.
   const radial=new THREE.Vector3(p.x,0,p.z).normalize();
   p.addScaledVector(radial,.34);
  }
  return p;
 };
 const put=(v:THREE.Vector3)=>verts.push(v.x,v.y,v.z);
 for(let i=0;i<frames.length;i++){
  const a=frames[i],b=frames[(i+1)%frames.length];
  const lo=edge(a,-1,i%8===7),hi=edge(a,1,i%8===7),
   nextLo=edge(b,-1,i%8===7),nextHi=edge(b,1,i%8===7);
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
 geometry.userData.h58EdgeClearance=.16;
 geometry.userData.h58CornerClearance=.34;
 bandGeometryByShell.set(key,geometry);
 return geometry;
}
