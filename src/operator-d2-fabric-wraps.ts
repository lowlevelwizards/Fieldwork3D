/**
 * D2-A2. Three distinct cloth wrap families, in canonical -Z head space.
 * Wearing modes share one catalog model; each mode is an actual prebuilt
 * silhouette, never a uniform-scale transform of one generic neck cube.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
export type D2WrapId='gaiter'|'shemagh'|'bandana';
export type D2WrapMode='lowered'|'mouth'|'nose'|'draped'|
 'face-wrap'|'head-wrap'|'raised';
type Part=[name:string,x:number,y:number,z:number,w:number,h:number,d:number];
const make=(g:THREE.Group,m:THREE.Material,
 [name,x,y,z,w,h,d]:Part)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(
  new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 return mesh;
};
function group(root:THREE.Group,mode:D2WrapMode){
 const g=new THREE.Group();
 g.name='d2-wrap-'+mode;
 g.userData.d2WrapMode=mode;
 root.add(g);
 return g;
}
function gaiter(root:THREE.Group,cloth:THREE.Material){
 for(const mode of ['lowered','mouth','nose'] as const){
  const g=group(root,mode);
  const top=mode==='lowered'?-.72:mode==='mouth'?1.72:3.25;
  const bottom=mode==='lowered'?-3.0:-2.9;
  const height=top-bottom;
  const frontZ=mode==='lowered'?-2.4:-4.22;
  const halfW=mode==='lowered'?3.0:4.0;
  make(g,cloth,['front-tube',0,(top+bottom)/2,frontZ,halfW*2,height,.56]);
  make(g,cloth,['rear-tube',0,(top+bottom)/2,
   mode==='lowered'?2.36:4.12,halfW*2,height,.58]);
  for(const side of [-1,1]){
   make(g,cloth,['tube-side',side*halfW,(top+bottom)/2,0,.58,height,8.0]);
  }
  // One strong upper fold; the raised version gets a crisp nose wedge.
  make(g,cloth,['top-fold',0,top-.16,frontZ-.06,halfW*2+.08,.42,.65]);
  if(mode==='nose')
   make(g,cloth,['nose-tent',0,2.91,-4.48,2.85,.52,.42]);
 }
}
function shemagh(root:THREE.Group,cloth:THREE.Material){
 for(const mode of ['draped','face-wrap','head-wrap'] as const){
  const g=group(root,mode);
  // Thick loose folded collar, clear of the uncovered face by default.
  make(g,cloth,['neck-fold',0,-2.0,-1.14,8.85,2.75,5.4]);
  make(g,cloth,['front-scarf-fold',0,-2.3,-4.25,8.7,1.0,1.25]);
  make(g,cloth,['lower-triangle',-.7,-4.05,-4.34,6.9,2.25,.75]);
  make(g,cloth,['lower-point',-1.35,-5.2,-4.50,3.9,1.4,.78]);
  make(g,cloth,['shoulder-tail',3.92,-3.1,.1,1.65,4.05,2.55]);
  make(g,cloth,['side-wrap-left',-4.2,-.85,0,.64,3.4,7.85]);
  if(mode!=='draped'){
   make(g,cloth,['face-wrap',0,1.34,-4.38,8.5,3.0,.78]);
   make(g,cloth,['nose-crease',0,2.65,-4.55,3.0,.46,.36]);
   make(g,cloth,['back-wrap',0,1.25,4.12,8.4,2.65,.58]);
  }
  if(mode==='head-wrap'){
   make(g,cloth,['head-crown',0,7.25,0,8.55,.58,8.55]);
   make(g,cloth,['hood-back',0,4.5,4.18,8.5,5.15,.45]);
   for(const side of [-1,1])
    make(g,cloth,['hood-side',side*4.22,4.55,0,.45,5.0,8.45]);
   make(g,cloth,['hood-forehead',0,6.2,-4.25,8.5,1.95,.54]);
  }
 }
}
function bandana(root:THREE.Group,cloth:THREE.Material){
 for(const mode of ['raised','lowered'] as const){
  const g=group(root,mode);
  const base=mode==='raised'?2.05:-.90;
  const frontZ=mode==='raised'?-4.35:-2.43;
  // Three broad stepped layers express the pointed cloth triangle without
  // a smooth curved mesh. Big rear knot communicates a tied bandana.
  make(g,cloth,['triangle-top',0,base,frontZ,7.75,1.1,.48]);
  make(g,cloth,['triangle-middle',0,base-1.03,frontZ-.12,5.6,1.03,.49]);
  make(g,cloth,['triangle-tip',0,base-1.82,frontZ-.18,2.8,.64,.49]);
  for(const side of [-1,1])
   make(g,cloth,['side-tie',side*3.9,base+.2,0,.65,.6,8.18]);
  make(g,cloth,['rear-knot',0,base+.13,4.32,1.65,1.25,1.15]);
  make(g,cloth,['rear-tail',1.08,base-.75,4.34,1.08,1.7,.66]);
 }
}
/** Returns the single item, with each mutually exclusive wear mode prebuilt. */
export function createD2FabricWrap(id:D2WrapId,cloth:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='gaiter')gaiter(root,cloth);
 else if(id==='shemagh')shemagh(root,cloth);
 else bandana(root,cloth);
 const defaultMode=id==='gaiter'?'nose':id==='shemagh'?'draped':'raised';
 for(const mode of root.children)mode.visible=mode.userData.d2WrapMode===defaultMode;
 return root;
}
