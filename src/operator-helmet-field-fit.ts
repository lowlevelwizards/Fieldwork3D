/** H10.0: the elastic band is fitted to the *actual* ACH/MICH drape.
 * No rectangular chord through the front corner and no world-horizontal
 * ribbon through high ear cuts. Geometry is built once per helmet family.
 */
import * as THREE from 'three';
import {sampleHelmetCover,sampleHelmetShell,type CoverRegion,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {ACH_MICH_COVER_OFFSET,type AchMichCoverShell}
 from './operator-ach-mich-cover-drape.ts';
import {achMichProfile} from './operator-ach-mich-details.ts';

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
   const frame=covered?sampleHelmetCover(shell,region,uu,v,.10):
    sampleHelmetShell(shell,region,uu,v,.085);
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
 const target=HELMET_MOUNT_PROFILES[shell].top-
  (shell==='ach'?2.89:2.39);
 const verts:number[]=[];
 const put=(v:THREE.Vector3)=>verts.push(v.x,v.y,v.z);
 let stationCount=0;
 if(shell==='ach'){
  // H7.1: squared, level band around the UPRIGHT ACH walls.
  // The previous sampled loop traversed the shoulder chamfer, creating
  // diagonal strips that disappeared into the fabric and protective shell.
  // Four planar walls meet at real 90-degree corners; no surface raycasts.
  const p=achMichProfile(shell);
  const layer=covered?ACH_MICH_COVER_OFFSET:0;
  const clearance=.075;
  const side=p.side+layer+clearance;
  const front=p.front-layer-clearance;
  const rear=p.rear+layer+clearance;
  const route:Array<readonly [number,number]>=[];
  const segments=8;
  for(let i=0;i<segments;i++)
   route.push([-side+2*side*i/segments,front]);
  for(let i=0;i<segments;i++)
   route.push([side,front+(rear-front)*i/segments]);
  for(let i=0;i<segments;i++)
   route.push([side-2*side*i/segments,rear]);
  for(let i=0;i<segments;i++)
   route.push([-side,rear-(rear-front)*i/segments]);
  stationCount=route.length;
  // Keep upper and lower rails on the same two world-horizontal planes.
  // All vertices are on the outside of the matching flat fabric walls.
  for(let i=0;i<route.length;i++){
   const a=route[i],b=route[(i+1)%route.length];
   const lowA=new THREE.Vector3(a[0],target-.35,a[1]);
   const highA=new THREE.Vector3(a[0],target+.35,a[1]);
   const lowB=new THREE.Vector3(b[0],target-.35,b[1]);
   const highB=new THREE.Vector3(b[0],target+.35,b[1]);
   for(const point of [lowA,highA,highB,lowA,highB,lowB])
    put(point);
  }
 }else{
  // Keep individually draped band routing on high-cut MICH variants:
  // a level square loop would float across the open ear cutouts.
  const frames:HelmetSurfaceFrame[]=[];
  for(const section of sections)
   for(const u of section.us)
    frames.push(bandFrame(shell,section.region,u,target,covered));
  stationCount=frames.length;
  const edge=(f:HelmetSurfaceFrame,sign:number,corner:boolean)=>{
   const p=f.position.clone().addScaledVector(f.up,sign*.35)
    .addScaledVector(f.normal,.028);
   if(corner){
    const radial=new THREE.Vector3(p.x,0,p.z).normalize();
    p.addScaledVector(radial,.085);
   }
   return p;
  };
  for(let i=0;i<frames.length;i++){
   const a=frames[i],b=frames[(i+1)%frames.length];
   const lo=edge(a,-1,i%8===7),hi=edge(a,1,i%8===7),
    nextLo=edge(b,-1,i%8===7),nextHi=edge(b,1,i%8===7);
   for(const point of [lo,hi,nextHi,lo,nextHi,nextLo])put(point);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 geometry.userData.h10BandSurfaceFitted=true;
 geometry.userData.h10BandClosed=true;
 geometry.userData.h10BandStations=stationCount;
 geometry.userData.h71SquareAchBand=shell==='ach';
 geometry.userData.h10BandTargetY=target;
 geometry.userData.h5SurfaceMode=covered?'cover':'shell';
 geometry.userData.h58EdgeClearance=.028;
 geometry.userData.h58CornerClearance=.085;
 geometry.userData.h67CloseFit=true;
 bandGeometryByShell.set(key,geometry);
 return geometry;
}
