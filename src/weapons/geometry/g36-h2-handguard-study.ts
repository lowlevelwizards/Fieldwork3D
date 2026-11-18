/** H2 study only — original long G36 handguard as a separately reviewable
 * exaggerated miniature. Not imported by Arsenal, saves or breach gameplay.
 * Based on original G36 full-length polymer fore-end reference photographs.
 */
import * as THREE from 'three';
import {addG36LongHandguard} from './g36-handguard-profiles.ts';

export type G36H2Options={
 width:number;
 showMouth:boolean;
 showVents:boolean;
 showBoss:boolean;
};
export const G36_H2_DEFAULTS:Readonly<G36H2Options>=Object.freeze({
 width:1,showMouth:true,showVents:true,showBoss:true
});
type Ring=Readonly<{
 x:number;top:number;bottom:number;half:number;
 /** Only terminal stations lean in X. The middle remains straight and thick. */
 roofShift?:number;floorShift?:number
}>;
/** H2.1 A: two visibly angled ends, deliberately parallel fat center.
 * Roof/floor shifts create *true angled end faces*, not only tapered stations.
 */
export const G36_H2_STATIONS:ReadonlyArray<Ring>=Object.freeze([
 {x:0,top:.95,bottom:-1.12,half:1.30,roofShift:.62,floorShift:0},
 {x:1.25,top:1.50,bottom:-1.62,half:1.52},
 {x:7.75,top:1.50,bottom:-1.62,half:1.52},
 {x:8.80,top:1.39,bottom:-1.46,half:1.45},
 {x:9.85,top:.81,bottom:-1.01,half:1.31,roofShift:-.26,floorShift:.15}
]);

// Eight perimeter landmarks, NOT a rounded tube: broad roof / sloping shoulder
// / vertical side / lower inward return / broad flat floor.
export function h2Section(r:Ring,width=1):readonly (readonly [number,number])[]{
 const half=r.half*width,depth=r.top-r.bottom;
 const shoulder=r.top-depth*.20;
 const lower=r.bottom+depth*.15;
 return [
  [r.top,-half*.76],[r.top,half*.76],
  [shoulder,half],[lower,half*.96],
  [r.bottom,half*.79],[r.bottom,-half*.79],
  [lower,-half*.96],[shoulder,-half]
 ];
}
/** Shift vertices across the terminal ring according to height so the
 * rear and front end planes visibly lean, while the body keeps five stations.
 * Top corners bend forward at the rear; at the nose the top ends earlier than
 * the lower lip. Side silhouette stays readable with all details disabled.
 */
export function h2StationVertices(r:Ring,width=1):readonly (readonly [number,number,number])[]{
 const center=(r.top+r.bottom)/2,halfHeight=(r.top-r.bottom)/2;
 return h2Section(r,width).map(([y,z])=>{
  const t=(y-center)/halfHeight;
  const shift=t>=0?(r.roofShift??0)*t:(r.floorShift??0)*(-t);
  return [r.x+shift,y,z] as const;
 });
}
const addTriangle=(a:number[],...v:number[])=>{a.push(...v)};
function makeShell(mat:THREE.Material,width:number,withMouth:boolean):THREE.Mesh{
 const positions:number[]=[],faces:number[]=[];
 for(const r of G36_H2_STATIONS)
  for(const [x,y,z] of h2StationVertices(r,width))positions.push(x,y,z);
 const sides=8,ringCount=G36_H2_STATIONS.length;
 for(let r=0;r<ringCount-1;r++)for(let j=0;j<sides;j++){
  const a=r*sides+j,b=r*sides+(j+1)%sides,
   c=(r+1)*sides+j,d=(r+1)*sides+(j+1)%sides;
  addTriangle(faces,a,c,b,b,c,d);
 }
 // Flat back face, invisible when mounted to the receiver but essential for
 // checking the object alone. The FRONT is deliberately an actual open rim.
 for(let j=1;j<sides-1;j++)addTriangle(faces,0,j,j+1);
 const front=(ringCount-1)*sides;
 if(withMouth){
  const last=G36_H2_STATIONS[ringCount-1],mid=(last.top+last.bottom)/2;
  const outer=h2StationVertices(last,width);
  const innerStart=positions.length/3;
  // One heavy beveled rim ONLY. No second bevel, throat ring or fake hardware.
  // The inner face is recessed 0.27 along X behind the slanted nose.
  for(const [x,y,z] of outer)
   positions.push(x-.27,mid+(y-mid)*.68,z*.68);
  for(let j=0;j<sides;j++){
   const k=(j+1)%sides;
   addTriangle(faces,front+j,front+k,innerStart+j,
    front+k,innerStart+k,innerStart+j);
  }
 }else{
  for(let j=1;j<sides-1;j++)addTriangle(faces,front,front+j+1,front+j);
 }
 const indexed=new THREE.BufferGeometry();
 indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 indexed.setIndex(faces);
 const geom=indexed.toNonIndexed();indexed.dispose();geom.computeVertexNormals();
 const mesh=new THREE.Mesh(geom,mat);mesh.name='H2 · one molded open-shell mass';
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.h2PrimaryShell=true;
 mesh.userData.h2CrossSectionCorners=8;
 mesh.userData.h2Stations=5;
 return mesh;
}
function openingBack(width:number,mat:THREE.Material):THREE.Mesh{
 const r=G36_H2_STATIONS[G36_H2_STATIONS.length-1],
   mid=(r.top+r.bottom)/2,section=h2StationVertices(r,width);
 const vertices:number[]=[],triangles:number[]=[];
 for(const [x,y,z] of section)
  vertices.push(x-.272,mid+(y-mid)*.68,z*.68);
 for(let j=1;j<7;j++)triangles.push(0,j,j+1);
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geom.setIndex(triangles);geom.computeVertexNormals();
 const face=new THREE.Mesh(geom,mat);
 face.name='H2 · dark recessed front opening';
 face.userData.h2MouthRecess=true;
 return face;
}
function bossShape(material:THREE.Material):THREE.Mesh{
 // H2.1 C: preserve only one chunky raised rear boss with one six-sided
 // punch-out. No duplicate mounts, fastener geometry, seams or screws.
 const path=new THREE.Shape();
 path.moveTo(1.15,1.46);path.lineTo(1.15,1.96);
 path.lineTo(1.42,2.10);path.lineTo(2.03,2.10);
 path.lineTo(2.20,1.90);path.lineTo(2.20,1.46);
 path.closePath();
 const hole=new THREE.Path();
 hole.absarc(1.67,1.79,.12,0,Math.PI*2,true);
 path.holes.push(hole);
 const geo=new THREE.ExtrudeGeometry(path,{
  depth:.53,steps:1,bevelEnabled:false,curveSegments:6
 });
 geo.translate(0,0,-.265);
 const mesh=new THREE.Mesh(geo,material);mesh.name='H2 · raised HK mounting lug';
 mesh.userData.h2MountingLug=true;
 return mesh;
}
/** H2.1 B: FOUR large, nearly square-ended graphic slits.
 * Big enough to survive the 64px view, without mechanical trim or bevels.
 */
export const G36_H2_VENT_CENTERS=[2.50,4.27,6.04,7.81] as const;
export const G36_H2_VENT_SIZE=Object.freeze({length:1.32,height:.40,centerY:.43});
function ventShape():THREE.ShapeGeometry{
 const h=G36_H2_VENT_SIZE.height/2,w=G36_H2_VENT_SIZE.length/2,r=.045;
 const path=new THREE.Shape();
 path.moveTo(-w+r,-h);
 path.lineTo(w-r,-h);
 path.quadraticCurveTo(w,-h,w,-h+r);
 path.lineTo(w,h-r);
 path.quadraticCurveTo(w,h,w-r,h);
 path.lineTo(-w+r,h);
 path.quadraticCurveTo(-w,h,-w,h-r);
 path.lineTo(-w,-h+r);
 path.quadraticCurveTo(-w,-h,-w+r,-h);
 return new THREE.ShapeGeometry(path,5);
}
function vents(width:number,mat:THREE.Material):THREE.InstancedMesh{
 // Four high *large* vents, not five fine slits. One instanced draw call
 // across two sides. The broad side face is not perfectly vertical; position
 // the markings on its plane rather than floating ahead of it.
 const n=G36_H2_VENT_CENTERS.length;
 const geo=ventShape(),mesh=new THREE.InstancedMesh(geo,mat,n*2);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(let side=0;side<2;side++)for(let i=0;i<n;i++){
  const x=G36_H2_VENT_CENTERS[i];
  const roof=G36_H2_STATIONS[1].top;
  const floor=G36_H2_STATIONS[1].bottom;
  const shoulder=roof-(roof-floor)*.20;
  const lower=floor+(roof-floor)*.15;
  const fraction=(shoulder-G36_H2_VENT_SIZE.centerY)/(shoulder-lower);
  const sideDepth=G36_H2_STATIONS[1].half*(1-.04*fraction);
  const z=(side===0?1:-1)*(sideDepth*width+.008);
  const center=new THREE.Vector3(x,G36_H2_VENT_SIZE.centerY,z);
  q.setFromAxisAngle(new THREE.Vector3(0,1,0),side===0?0:Math.PI);
  matrix.compose(center,q,new THREE.Vector3(1,1,1));
  mesh.setMatrixAt(side*n+i,matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.name='H2.1 · four bold upper vents / both sides';
 mesh.userData.h2VentCountPerSide=n;
 mesh.userData.h2GraphicVents=true;
 return mesh;
}
export function buildG36H2Handguard(options:Partial<G36H2Options>={}):THREE.Group{
 const o={...G36_H2_DEFAULTS,...options};
 const dark=new THREE.MeshBasicMaterial({color:0x121916,side:THREE.DoubleSide});
 const polymer=new THREE.MeshStandardMaterial({
  color:0x3b423e,roughness:.97,metalness:0,flatShading:true,side:THREE.DoubleSide
 });
 const result=new THREE.Group();result.name='H2 isolated original G36 handguard';
 result.userData.studyOnly=true;result.userData.handguardArtVersion='h2.1-angled-four-vents';
 result.add(makeShell(polymer,o.width,o.showMouth));
 if(o.showMouth)result.add(openingBack(o.width,dark));
 if(o.showBoss)result.add(bossShape(polymer));
 if(o.showVents)result.add(vents(o.width,dark));
 // The isolated design is centered so turntable angles remain stable.
 result.position.x=-5;
 return result;
}
/** Comparison imported directly from deployed H1 source, never repainted. */
export function buildG36H1HandguardComparison():THREE.Group{
 const root=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({
  color:0x3b423e,roughness:.97,metalness:0,flatShading:true,side:THREE.DoubleSide
 });
 const h1=addG36LongHandguard(root,'h1-study',0,mat);
 h1.position.x=-3.75;
 // Only for A/B visualization: reproduce the deployed four narrow, square-ended
 // H1 atlas stamps without importing the rest of the rifle/pixel-atlas pipeline.
 const geom=new THREE.PlaneGeometry(1.70,.56);
 const dark=new THREE.MeshBasicMaterial({color:0x121916,side:THREE.DoubleSide});
 const stamps=new THREE.InstancedMesh(geom,dark,8);
 const tx=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(let side=0;side<2;side++)for(let i=0;i<4;i++){
  const x=[5.35,7.40,9.45,11.50][i]-3.75;
  q.setFromAxisAngle(new THREE.Vector3(0,1,0),side===0?0:Math.PI);
  tx.compose(new THREE.Vector3(x,.11,(side===0?1:-1)*1.463),
   q,new THREE.Vector3(1,1,1));
  stamps.setMatrixAt(side*4+i,tx);
 }
 stamps.instanceMatrix.needsUpdate=true;
 stamps.name='H1 · actual four rectangular atlas stamps, preview-only';
 root.add(stamps);
 root.position.x=-4.85;
 root.userData.studyOnly=true;
 return root;
}
export function h2StudyStatistics(g:THREE.Group){
 let triangles=0,meshes=0;
 g.traverse(obj=>{
  if(!(obj instanceof THREE.Mesh))return;
  meshes++;
  const geom=obj.geometry as THREE.BufferGeometry;
  triangles+=(geom.index?.count??geom.getAttribute('position').count)/3*
   (obj instanceof THREE.InstancedMesh?obj.count:1);
 });
 return {meshes,triangles,stations:G36_H2_STATIONS.length,
  corners:8,ventsPerSide:g.getObjectByName('H2.1 · four bold upper vents / both sides')?4:0};
}
