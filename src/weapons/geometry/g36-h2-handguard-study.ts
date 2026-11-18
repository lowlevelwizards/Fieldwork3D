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
type Ring=Readonly<{x:number;top:number;bottom:number;half:number}>;
export const G36_H2_STATIONS:ReadonlyArray<Ring>=Object.freeze([
 {x:0,top:1.20,bottom:-1.38,half:1.34},    // receiver/root, low and broad
 {x:.45,top:1.48,bottom:-1.58,half:1.50},  // chunky moulded main body
 {x:7.90,top:1.48,bottom:-1.58,half:1.50},// almost parallel long body
 {x:9.20,top:1.43,bottom:-1.54,half:1.44},// start of blunt nose transition
 {x:10,top:1.06,bottom:-1.32,half:1.30}   // recognizable clipped front
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
const addTriangle=(a:number[],...v:number[])=>{a.push(...v)};
function makeShell(mat:THREE.Material,width:number,withMouth:boolean):THREE.Mesh{
 const positions:number[]=[],faces:number[]=[];
 for(const r of G36_H2_STATIONS)
  for(const [y,z] of h2Section(r,width))positions.push(r.x,y,z);
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
  const innerStart=positions.length/3;
  for(const [y,z] of h2Section(last,width)){
   positions.push(last.x,mid+(y-mid)*.63,z*.67);
  }
  const throatStart=positions.length/3;
  for(const [y,z] of h2Section(last,width)){
   positions.push(last.x-.45,mid+(y-mid)*.63,z*.67);
  }
  for(let j=0;j<sides;j++){
   const k=(j+1)%sides;
   addTriangle(faces,front+j,front+k,innerStart+j,front+k,innerStart+k,innerStart+j);
   addTriangle(faces,innerStart+j,innerStart+k,throatStart+j,
    innerStart+k,throatStart+k,throatStart+j);
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
   mid=(r.top+r.bottom)/2,section=h2Section(r,width);
 const vertices:number[]=[],triangles:number[]=[];
 for(const [y,z] of section)vertices.push(9.52,mid+(y-mid)*.63,z*.67);
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
 // A single bold silhouette block on the upper rear portion, with one genuine
 // void. This is not detailed fastening hardware.
 const path=new THREE.Shape();
 path.moveTo(1.15,1.46);path.lineTo(1.15,1.96);
 path.lineTo(1.42,2.10);path.lineTo(2.03,2.10);
 path.lineTo(2.20,1.90);path.lineTo(2.20,1.46);
 path.closePath();
 const hole=new THREE.Path();
 hole.absarc(1.67,1.79,.115,0,Math.PI*2,true);
 path.holes.push(hole);
 const geo=new THREE.ExtrudeGeometry(path,{
  depth:.53,steps:1,bevelEnabled:false,curveSegments:8
 });
 geo.translate(0,0,-.265);
 const mesh=new THREE.Mesh(geo,material);mesh.name='H2 · raised HK mounting lug';
 mesh.userData.h2MountingLug=true;
 return mesh;
}
function ventShape():THREE.ShapeGeometry{
 const h=.115,w=.50,r=.110;
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
 // Five *high* elongated openings, not four square stamps in the center.
 // Placed on long flat side plane, paired both sides, without decorative rims.
 const n=5,geo=ventShape(),mesh=new THREE.InstancedMesh(geo,mat,n*2);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(let side=0;side<2;side++)for(let i=0;i<n;i++){
  const x=2.7+i*1.32;
  const z=(side===0?1:-1)*(1.5*width+.009);
  const center=new THREE.Vector3(x,.53,z);
  q.setFromAxisAngle(new THREE.Vector3(0,1,0),side===0?0:Math.PI);
  matrix.compose(center,q,new THREE.Vector3(1,1,1));
  mesh.setMatrixAt(side*n+i,matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.name='H2 · five high slotted vents / both sides';
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
 result.userData.studyOnly=true;result.userData.handguardArtVersion='h2-reference-major-forms';
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
  corners:8,ventsPerSide:g.getObjectByName('H2 · five high slotted vents / both sides')?5:0};
}
