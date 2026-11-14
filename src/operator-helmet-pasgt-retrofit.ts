/** H14: separate, OPTIONAL PASGT retrofit surface kit.
 * Does not borrow ACH/MICH geometry or permanently modify the PASGT shell.
 * Period baseline remains a cover, cat-eye band, goggles and strap-on NVG.
 * Later aftermarket side-rail and fabric-pad hardware is explicitly optional.
 * All geometries are authored once and switched by cover state, not per frame.
 */
import * as THREE from 'three';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {helmetHexFastenerGeometry} from './operator-helmet-fasteners.ts';
const p=HELMET_MOUNT_PROFILES.pasgt;
const put=(g:THREE.Group,name:string,geometry:THREE.BufferGeometry,
 material:THREE.Material)=>{
 const o=new THREE.Mesh(geometry,material);
 o.name=name;o.castShadow=false;o.receiveShadow=false;g.add(o);return o;
};
const quad=(out:number[],points:readonly THREE.Vector3[])=>{
 for(const i of [0,1,2,0,2,3])out.push(...points[i].toArray());
};
const flatRibbon=(points:readonly THREE.Vector3[],width:number)=>{
 const verts:number[]=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  quad(verts,[
   a.clone().add(new THREE.Vector3(0,width/2,0)),
   a.clone().add(new THREE.Vector3(0,-width/2,0)),
   b.clone().add(new THREE.Vector3(0,-width/2,0)),
   b.clone().add(new THREE.Vector3(0,width/2,0))
  ]);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.h14FlatSegments=points.length-1;
 return g;
};
const profiles=(root:THREE.Group,key:string,make:(g:THREE.Group,layer:number)=>void)=>{
 for(const [covered,layer] of [[true,.18],[false,0]] as const){
  const g=new THREE.Group();
  g.name='pasgt-'+key+'-'+(covered?'covered':'bare');
  g.visible=covered;root.add(g);make(g,layer);
 }
 root.userData.h14CoverAware=true;
};
const sideBand=(g:THREE.Group,sign:number,layer:number,
 mat:THREE.Material,dark:THREE.Material,light:THREE.Material)=>{
 const x=sign*(p.side+layer+.25);
 const stations:[number,number,number][]=[
  [-2.8,5.60,.46],[-1.45,5.78,.57],[.35,5.83,.60],
  [2.35,5.51,.62],[3.83,5.02,.56]
 ];
 const data:number[]=[];
 for(let i=1;i<stations.length;i++){
  const [az,ay,aw]=stations[i-1],[bz,by,bw]=stations[i];
  quad(data,[new THREE.Vector3(x,ay+aw,az),
   new THREE.Vector3(x,ay-aw,az),
   new THREE.Vector3(x,by-bw,bz),
   new THREE.Vector3(x,by+bw,bz)]);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 geo.computeVertexNormals();geo.computeBoundingBox();
 put(g,'pasgt-retrofit-curved-rail',geo,mat);
 // Five graphic slots: a shallow dark notch, not extra recessed hardware.
 for(const z of [-1.75,-.8,.27,1.37,2.50]){
  const o=put(g,'pasgt-arc-slot',new THREE.PlaneGeometry(.26,.60),dark);
  o.position.set(x+sign*.025,5.66-(Math.max(0,z-1)*.18),z);
  o.rotation.y=sign*Math.PI/2;
 }
 for(const [z,y] of [[-2.66,5.61],[3.64,5.08]]){
  const o=put(g,'pasgt-arc-hex-bolt',
   helmetHexFastenerGeometry([[0,0]],.25,.015),light);
  o.position.set(x+sign*.06,y,z);
  o.rotation.y=sign*Math.PI/2;
 }
};
/** Authentic PASGT NVG head strap follows the original crown to nape,
 * unlike later three-point ARC hardware. Two static cloth paths share the
 * period bracket, never requiring rails or bungees.
 */
export function addPasgtPeriodNvgStrap(root:THREE.Group,elastic:THREE.Material){
 profiles(root,'nvg-strap',(g,layer)=>{
  const path=[
   new THREE.Vector3(0,6.98,p.front-.39),
   new THREE.Vector3(0,8.53+layer,-5.47),
   new THREE.Vector3(0,p.top+layer+.16,-4.26),
   new THREE.Vector3(0,p.top+layer+.18,4.12),
   new THREE.Vector3(0,6.90,p.rear+layer+.13)
  ];
  // Crown textile is horizontal; a single quad per physical segment.
  const data:number[]=[],half=.43;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];
   quad(data,[a.clone().add(new THREE.Vector3(-half,0,0)),
    a.clone().add(new THREE.Vector3(half,0,0)),
    b.clone().add(new THREE.Vector3(half,0,0)),
    b.clone().add(new THREE.Vector3(-half,0,0))]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  geometry.userData.h14PeriodNvgTopStrap=true;
  put(g,'period-pasgt-nvg-retaining-strap',geometry,elastic);
 });
 root.userData.h14PeriodNvgStrap=true;
}
export function addPasgtRetrofitRails(root:THREE.Group,
 metal:THREE.Material,dark:THREE.Material,light:THREE.Material){
 profiles(root,'rails',(g,layer)=>{
  for(const sign of [-1,1])sideBand(g,sign,layer,metal,dark,light);
 });
 root.userData.h14Period='later-retrofit';
 root.userData.h14PasgtRailSides=2;
}
export function addPasgtRetrofitBungees(root:THREE.Group,
 elastic:THREE.Material,metal:THREE.Material){
 profiles(root,'bungees',(g,layer)=>{
  for(const sign of [-1,1]){
   const x=sign*(p.side+layer+.48),front=p.front-layer-.53;
   const path=[
    new THREE.Vector3(x,6.12,-2.64),
    new THREE.Vector3(x,6.14,front+.65),
    new THREE.Vector3(x-sign*.65,6.14,front),
    new THREE.Vector3(sign*1.68,6.16,front)
   ];
   put(g,'pasgt-corner-safe-bungee',flatRibbon(path,.23),elastic);
   for(const at of [path[0],path[path.length-1]]){
    const hook=put(g,'pasgt-bungee-retention-hook',
     new THREE.BoxGeometry(.32,.25,.15),metal);
    hook.position.copy(at);
   }
  }
 });
 root.userData.h14DiagonalBreak=true;
 root.userData.h14Period='later-retrofit';
}
const panel=(g:THREE.Group,mat:THREE.Material,
 name:string,x:number,y:number,z:number,w:number,h:number,ry=0)=>{
 const m=put(g,name,new THREE.PlaneGeometry(w,h),mat);
 m.position.set(x,y,z);m.rotation.y=ry;return m;
};
export function addPasgtRetrofitVelcro(root:THREE.Group,
 fabric:THREE.Material,dark:THREE.Material){
 profiles(root,'velcro',(g,layer)=>{
  for(const sign of [-1,1]){
   panel(g,fabric,'pasgt-side-velcro',sign*(p.side+layer+.25),
    6.27,.52,2.0,.83,sign*Math.PI/2);
  }
  const crown=panel(g,fabric,'pasgt-crown-velcro',0,p.top+layer+.10,.8,2.0,1.3);
  crown.rotation.x=-Math.PI/2;
  panel(g,dark,'pasgt-rear-velcro',0,6.30,p.rear+layer+.24,2.5,.95);
 });
 root.userData.h14Period='later-adhesive-panels';
}
export function addPasgtRetrofitIdentifier(root:THREE.Group,
 fabric:THREE.Material,dark:THREE.Material,light:THREE.Material){
 profiles(root,'patches',(g,layer)=>{
  const x=-(p.side+layer+.285);
  panel(g,dark,'pasgt-identifier-backing',x,6.26,1.0,2.45,1.10,-Math.PI/2);
  panel(g,fabric,'pasgt-identifier-patch',x-.025,6.26,1.0,
   2.24,.90,-Math.PI/2);
  panel(g,light,'pasgt-identifier-bar',x-.055,6.26,1.0,
   1.03,.14,-Math.PI/2);
 });
 root.userData.h14NotModernRailDependent=true;
}
export function updatePasgtRetrofitCover(root:THREE.Group,covered:boolean){
 root.traverse(o=>{
  if(o.name.endsWith('-covered'))o.visible=covered;
  else if(o.name.endsWith('-bare'))o.visible=!covered;
 });
}
