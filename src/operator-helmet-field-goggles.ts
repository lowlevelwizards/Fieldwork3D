/** H9.5 — field-goggle stowage, real textile retention and fitted cover.
 * The proven D2 gasket and lens shell remain unchanged. Only the head-fit
 * strap is removed for helmet stowage and replaced by a fitted, complete
 * band around the actual ACH/MICH textile surface. Built once per look.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,sampleHelmetShell} from './operator-helmet-surface.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {createD2GoggleFieldPose} from './operator-d2-goggle-visuals.ts';

type Placement='eyes'|'front'|'rear';
const hem=0.56;
const makeShape=(contour:readonly (readonly number[])[]):THREE.Shape=>{
 const sh=new THREE.Shape();
 contour.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));
 sh.closePath();return sh;
};
/** H12: one rectangular 16-segment perimeter wrap, deliberately outside
 * ALL four wall planes. Previous three straight side/diagonal chords crossed
 * the covered helmet and produced opaque slabs in the ear region.
 * Prebuilt bare/covered meshes share the same flat, economical topology.
 */
const perimeter=(shell:AchMichCoverShell,covered:boolean,y:number)=>{
 const p=HELMET_MOUNT_PROFILES[shell];
 const layer=covered?.205:0;
 const sx=p.side+layer+.43;
 const front=p.front-layer-.41,rear=p.rear+layer+.41;
 const points:THREE.Vector3[]=[];
 const steps=4;
 for(let i=0;i<steps;i++)points.push(
  new THREE.Vector3(-sx+2*sx*i/steps,y,front));
 for(let i=0;i<steps;i++)points.push(
  new THREE.Vector3(sx,y,front+(rear-front)*i/steps));
 for(let i=0;i<steps;i++)points.push(
  new THREE.Vector3(sx-2*sx*i/steps,y,rear));
 for(let i=0;i<steps;i++)points.push(
  new THREE.Vector3(-sx,y,rear-(rear-front)*i/steps));
 return points;
};
const strap=(root:THREE.Group,points:readonly THREE.Vector3[],
 material:THREE.Material,name:string)=>{
 const verts:number[]=[],width=.71;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const hiA=a.clone().add(new THREE.Vector3(0,width,0));
  const loA=a.clone().add(new THREE.Vector3(0,-width,0));
  const hiB=b.clone().add(new THREE.Vector3(0,width,0));
  const loB=b.clone().add(new THREE.Vector3(0,-width,0));
  for(const p of [hiA,loA,loB,hiA,loB,hiB])
   verts.push(p.x,p.y,p.z);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 geometry.userData.h12NoChordThroughShell=true;
 geometry.userData.h12PerimeterSegments=points.length;
 const m=new THREE.Mesh(geometry,material);
 m.name=name;m.castShadow=false;m.receiveShadow=false;
 root.add(m);
};
function buildRetention(shell:AchMichCoverShell,g:THREE.Group,
 _placement:'front'|'rear',elastic:THREE.Material){
 const p=HELMET_MOUNT_PROFILES[shell];
 // Stay on the helmet's upright region with a generous lateral envelope.
 const y=p.top-3.05;
 const paths:Record<string,number[][]>={};
 for(const covered of [true,false]){
  const retention=new THREE.Group();
  retention.name=covered?'goggle-retention-covered':'goggle-retention-bare';
  retention.visible=covered;g.add(retention);
  const route=perimeter(shell,covered,y);
  strap(retention,route,elastic,covered?
   'continuous-helmet-goggle-strap':'bare-shell-goggle-strap');
  paths[covered?'covered':'bare']=route.map(v=>v.toArray());
 }
 g.userData.h10OverShellStrap=true;
 g.userData.h9FittedStrap=true;
 g.userData.h9StrapPath=paths.covered;
 g.userData.h9StrapSegments=16;
 g.userData.h9StrapWraps='full-perimeter';
 g.userData.h5AdaptiveStrapPaths=paths;
 g.userData.h5StrapOutsideElastic=true;
 g.userData.h12FullPerimeter=true;
 g.userData.h12StrapClearance=.43;
}
/** Fitted fabric cover drawn on the goggles' actual D2 silhouette.
 * It uses a shallow solid lip plus one broad stitched face, never an
 * unrelated rectangular board floating in front of the goggles.
 */
export function createFittedGoggleSleeve(pose:THREE.Group,tan:THREE.Material,dark:THREE.Material){
 const sleeve=new THREE.Group();
 sleeve.name='goggle-fabric-sleeve';sleeve.visible=false;
 sleeve.position.copy(pose.position);sleeve.quaternion.copy(pose.quaternion);
 // Match the same fourteen-point D2 field shell from field() rather
 // than an independent, wider rectangle that hangs past its gasket.
 const outer=[
  [-4.72,5.38],[-3.50,5.67],[3.50,5.67],[4.72,5.38],
  [4.89,4.62],[4.71,2.05],[3.31,1.75],[1.62,1.89],
  [.80,2.68],[-.80,2.68],[-1.62,1.89],[-3.31,1.75],
  [-4.71,2.05],[-4.89,4.62]
 ];
 const face=new THREE.Mesh(new THREE.ExtrudeGeometry(makeShape(outer),{
  depth:.72,steps:1,bevelEnabled:true,bevelThickness:.12,
  bevelSize:.16,bevelSegments:1,curveSegments:1
 }),tan);
 face.position.z=-6.06;face.name='fitted-sleeve-folded-cloth';
 face.castShadow=false;face.receiveShadow=false;sleeve.add(face);
 // One broad folded opening reads as a padded protective pouch, not
 // a flat fabric decal or a second rigid pair of goggles.
 const flap=new THREE.Mesh(new THREE.BoxGeometry(8.66,.37,.18),dark);
 flap.position.set(0,5.42,-6.22);
 flap.name='sleeve-padded-top-opening';
 flap.castShadow=false;flap.receiveShadow=false;sleeve.add(flap);
 sleeve.userData.h9HousingFitted=true;
 sleeve.userData.h9FaceContourPoints=outer.length;
 sleeve.userData.h9HemThickness=hem;
 sleeve.userData.h69SoftPouchDepth=.72;
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
  pose.rotation.y=Math.PI;pose.position.set(0,p.top-6.78,p.rear-4.66);
 }else if(placement==='front')pose.position.set(0,p.top-6.78,p.front+4.62);
 // Eye-worn D2 already has a proper strap geometry; stowed requires
 // the helmet contour band instead of a strap crossing through the shell.
 if(placement!=='eyes'){
  for(const child of [...pose.children])
   if(/strap/i.test(child.name)){pose.remove(child);}
  buildRetention(shell,g,placement,elastic);
 }
 g.add(pose);
 const sleeve=createFittedGoggleSleeve(pose,sleeveFabric,frame);
 if(placement==='eyes')sleeve.visible=false;
 g.add(sleeve);
 g.userData.h9HelmetGoggles=true;
 g.userData.h10ProudHousing=true;
 g.userData.h9Position=placement;
 return g;
}
