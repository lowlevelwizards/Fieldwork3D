/** H9.5 — field-goggle stowage, real textile retention and fitted cover.
 * The proven D2 gasket and lens shell remain unchanged. Only the head-fit
 * strap is removed for helmet stowage and replaced by a fitted, complete
 * band around the actual ACH/MICH textile surface. Built once per look.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover} from './operator-helmet-surface.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {createD2GoggleFieldPose} from './operator-d2-goggle-visuals.ts';

type Placement='eyes'|'front'|'rear';
const hem=0.56;
const makeShape=(contour:readonly (readonly number[])[]):THREE.Shape=>{
 const sh=new THREE.Shape();
 contour.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));
 sh.closePath();return sh;
};
const strip=(root:THREE.Group,points:THREE.Vector3[],width:number,
 material:THREE.Material,name:string):THREE.Mesh=>{
 const a:number[]=[];
 for(let i=1;i<points.length;i++){
  const p=points[i-1],q=points[i],h=width*.5;
  a.push(p.x,p.y-h,p.z,q.x,q.y-h,q.z,q.x,q.y+h,q.z,
   p.x,p.y-h,p.z,q.x,q.y+h,q.z,p.x,p.y+h,p.z);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));
 geo.computeVertexNormals();geo.computeBoundingBox();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;
 root.add(mesh);return mesh;
};
const sample=(shell:AchMichCoverShell,region:'left'|'right'|'front'|'back',
 u:number,v:number):THREE.Vector3=>{
 for(const vv of [v,v+.1,v-.1,.32,.1])
  for(const uu of [u,u*.9,u*.8]){
   const f=sampleHelmetCover(shell,region,uu,vv,.37);
   if(f)return f.position;
  }
 throw Error('H9.5 no '+region+' fitted goggle strap on '+shell);
};
function buildRetention(shell:AchMichCoverShell,g:THREE.Group,
 placement:'front'|'rear',elastic:THREE.Material,metal:THREE.Material){
 const p=HELMET_MOUNT_PROFILES[shell];
 const y=p.top-2.95;
 const front=placement==='front';
 const nearZ=front?p.front+.45:p.rear-.44;
 const left=new THREE.Vector3(-4.12,y,nearZ);
 const right=new THREE.Vector3(4.12,y,nearZ);
 const begin=front?-0.73:0.74,finish=-begin;
 const opposite=front?'back':'front';
 const path:THREE.Vector3[]=[left];
 for(const u of [begin,begin*.46,0,finish*.46,finish])
  path.push(sample(shell,'left',u,.19));
 for(const u of [-.68,-.35,0,.35,.68])
  path.push(sample(shell,opposite,u,.21));
 for(const u of [finish,finish*.46,0,begin*.46,begin])
  path.push(sample(shell,'right',u,.19));
 path.push(right);
 strip(g,path,1.06,elastic,'continuous-helmet-goggle-strap');
 // Broad external adjusters, one on each side, not independent blocks.
 for(const [side,region] of [[-1,'left'],[1,'right']] as const){
  const f=sampleHelmetCover(shell,region,front?-.06:.08,.19,.45);
  if(!f)continue;
  const buckle=new THREE.Mesh(new THREE.BoxGeometry(.32,1.23,.13),metal);
  buckle.position.copy(f.position);
  buckle.quaternion.setFromRotationMatrix(new THREE.Matrix4()
   .makeBasis(f.right,f.up,f.normal));
  buckle.name='helmet-strap-slider-'+region;
  buckle.castShadow=false;buckle.receiveShadow=false;g.add(buckle);
 }
 g.userData.h9FittedStrap=true;
 g.userData.h9StrapPath=path.map(v=>v.toArray());
 g.userData.h9StrapSegments=path.length-1;
 g.userData.h9StrapWraps=opposite;
}
/** Fitted fabric cover drawn on the goggles' actual D2 silhouette.
 * It uses a shallow solid lip plus one broad stitched face, never an
 * unrelated rectangular board floating in front of the goggles.
 */
function addSleeve(pose:THREE.Group,tan:THREE.Material,dark:THREE.Material){
 const sleeve=new THREE.Group();
 sleeve.name='goggle-fabric-sleeve';sleeve.visible=false;
 sleeve.position.copy(pose.position);sleeve.quaternion.copy(pose.quaternion);
 const outer=[
  [-4.42,4.99],[-3.12,5.21],[3.12,5.21],[4.42,4.99],
  [4.62,4.39],[4.34,2.23],[3.05,1.78],[1.35,1.91],
  [.65,2.68],[-.65,2.68],[-1.35,1.91],[-3.05,1.78],
  [-4.34,2.23],[-4.62,4.39]
 ];
 const face=new THREE.Mesh(new THREE.ExtrudeGeometry(makeShape(outer),{
  depth:.17,bevelEnabled:false,steps:1
 }),tan);
 face.position.z=-6.08;face.name='fitted-sleeve-folded-cloth';
 face.castShadow=false;face.receiveShadow=false;sleeve.add(face);
 const seal=new THREE.Mesh(new THREE.ShapeGeometry(makeShape([
  [-4.29,4.86],[-3.06,5.09],[3.06,5.09],[4.29,4.86],
  [4.46,4.28],[4.19,2.34],[2.96,1.94],[1.39,2.06],
  [.68,2.85],[-.68,2.85],[-1.39,2.06],[-2.96,1.94],
  [-4.19,2.34],[-4.46,4.28]
 ])),dark);
 seal.name='sleeve-subtle-stitched-outline';seal.position.z=-6.17;
 seal.castShadow=false;seal.receiveShadow=false;
 // Slim border effect: dark perimeter behind a smaller tan center panel.
 sleeve.add(seal);
 const panel=new THREE.Mesh(new THREE.ShapeGeometry(makeShape([
  [-4.06,4.74],[-2.88,4.98],[2.88,4.98],[4.06,4.74],
  [4.23,4.15],[3.98,2.50],[2.80,2.10],[1.44,2.19],
  [.75,2.93],[-.75,2.93],[-1.44,2.19],[-2.80,2.10],
  [-3.98,2.50],[-4.23,4.15]
 ])),tan);
 panel.name='sleeve-front-face';panel.position.z=-6.19;
 panel.castShadow=false;panel.receiveShadow=false;sleeve.add(panel);
 sleeve.userData.h9HousingFitted=true;
 sleeve.userData.h9FaceContourPoints=outer.length;
 sleeve.userData.h9HemThickness=hem;
 return sleeve;
}
export function createHelmetFieldGoggleModule(
 shell:AchMichCoverShell,placement:Placement,
 root:THREE.Group,frame:THREE.Material,lens:THREE.Material,
 elastic:THREE.Material,sleeveFabric:THREE.Material
):THREE.Group{
 const g=new THREE.Group();
 g.name='helmet-field-goggles-'+placement;root.add(g);
 const pose=createD2GoggleFieldPose(frame,lens,elastic);
 pose.name='approved-d2-goggle-pose';
 const p=HELMET_MOUNT_PROFILES[shell];
 if(placement==='rear'){
  pose.rotation.y=Math.PI;pose.position.set(0,p.top-6.78,p.rear-5.74);
 }else if(placement==='front')pose.position.set(0,p.top-6.78,p.front+5.70);
 // Eye-worn D2 already has a proper strap geometry; stowed requires
 // the helmet contour band instead of a strap crossing through the shell.
 if(placement!=='eyes'){
  for(const child of [...pose.children])
   if(/strap/i.test(child.name)){pose.remove(child);}
  buildRetention(shell,g,placement,elastic,frame);
 }
 g.add(pose);
 const sleeve=addSleeve(pose,sleeveFabric,frame);
 if(placement==='eyes')sleeve.visible=false;
 g.add(sleeve);
 g.userData.h9HelmetGoggles=true;
 g.userData.h9Position=placement;
 return g;
}
