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
/** One broad plane per authored strap section. No midpoint sampling,
 * tessellated wraps or hidden adjacent quads. Geometry is built once. */
const strip=(root:THREE.Group,points:THREE.Vector3[],width:number,
 material:THREE.Material,name:string):THREE.Mesh=>{
 const p=points[0],q=points[1];
 const along=q.clone().sub(p).normalize();
 const radial=p.clone().add(q).multiplyScalar(.5);
 radial.y=0;radial.normalize();
 const across=new THREE.Vector3().crossVectors(radial,along)
  .normalize().multiplyScalar(width*.5);
 const lift=radial.multiplyScalar(.075);
 const p0=p.clone().sub(across).add(lift),
  p1=p.clone().add(across).add(lift),
  q0=q.clone().sub(across).add(lift),
  q1=q.clone().add(across).add(lift);
 const data:number[]=[];
 for(const v of [p0,q0,q1,p0,q1,p1])data.push(v.x,v.y,v.z);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 geo.computeVertexNormals();geo.computeBoundingBox();
 geo.userData.h69OneBroadPlane=true;
 const mesh=new THREE.Mesh(geo,material);
 mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;
 root.add(mesh);return mesh;
};
/** Match a consistent real-world strap height across the helmet rather
 * than sampling the same normalized V on panels with different hem heights.
 * All probes happen once when the cosmetic model is constructed.
 */
const sample=(shell:AchMichCoverShell,region:'left'|'right'|'front'|'back',
 u:number,targetY:number,covered:boolean):THREE.Vector3=>{
 let best:THREE.Vector3|null=null,score=Infinity;
 for(const uu of [u,u*.94,u*.84])
  for(const v of [-.65,-.48,-.30,-.12,.06,.22,.38,.55,.72]){
   // Bare and covered strap routes must follow distinct actual surfaces.
   const f=covered?sampleHelmetCover(shell,region,uu,v,.22):
    sampleHelmetShell(shell,region,uu,v,.20);
   if(!f)continue;
   const d=Math.abs(f.position.y-targetY)+Math.abs(u-uu)*.32;
   if(d<score){score=d;best=f.position;}
  }
 if(!best)throw Error('H5.3 no '+region+' fitted goggle strap on '+shell);
 return best;
};
function buildRetention(shell:AchMichCoverShell,g:THREE.Group,
 placement:'front'|'rear',elastic:THREE.Material){
 const p=HELMET_MOUNT_PROFILES[shell];
 // Shift retention below the narrow elastic band while respecting the
 // MICH ear cutout; the outboard layer stays above rather than clipping it.
 const y=p.top-3.24;
 const front=placement==='front';
 const opposite=front?'back':'front';
 const paths:Record<string,number[][]>={};
 for(const covered of [true,false]){
  const retention=new THREE.Group();
  retention.name=covered?'goggle-retention-covered':'goggle-retention-bare';
  retention.visible=covered;g.add(retention);
  const left:[THREE.Vector3,THREE.Vector3]=[
   sample(shell,'left',front?-.84:.84,y,covered),
   sample(shell,'left',front?.84:-.84,y,covered)
  ];
  const right:[THREE.Vector3,THREE.Vector3]=[
   sample(shell,'right',front?.84:-.84,y,covered),
   sample(shell,'right',front?-.84:.84,y,covered)
  ];
  const diagonal:[THREE.Vector3,THREE.Vector3]=[
   sample(shell,opposite,-.82,y-.25,covered),
   sample(shell,opposite,.82,y+.25,covered)
  ];
  const name=covered?'continuous-helmet-goggle-strap':
   'bare-shell-goggle-strap';
  strip(retention,left,2.02,elastic,name);
  strip(retention,right,2.02,elastic,'right-goggle-strap-face');
  strip(retention,diagonal,2.02,elastic,'diagonal-goggle-strap-bridge');
  const path=[...left,...diagonal,...right];
  paths[covered?'covered':'bare']=path.map(v=>v.toArray());
 }
 g.userData.h10OverShellStrap=true;
 g.userData.h9FittedStrap=true;
 g.userData.h9StrapPath=paths.covered;
 g.userData.h9StrapSegments=3;
 g.userData.h69ThreePanelRetention=true;
 g.userData.h9StrapWraps=opposite;
 g.userData.h5AdaptiveStrapPaths=paths;
 g.userData.h5StrapOutsideElastic=true;
 g.userData.h62MidpointCornerClearance=false;
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
