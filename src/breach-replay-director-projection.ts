/** R8 single optical framing evaluator, shared by composer and rail.
 * Measures the actual ORTHO camera projected by Three.js, not a separate
 * yaw/pitch approximation. The returned zoom fits the required subjects,
 * including head/feet envelope, within the selected usable viewport.
 */
import * as THREE from 'three';
export type DirectorPoint={x:number;y:number};
export function directorOrthoFittingZoom(
  anchor:DirectorPoint,focus:DirectorPoint,
  points:readonly DirectorPoint[],aspect:number,baseSpan:number,
  usableWidth=.78,usableHeight=.76,
  limit=8.0,margin=.81
):number{
  if(!points.length)return 2;
  const span=Math.max(200,baseSpan);
  const ratio=Math.max(.42,aspect);
  const camera=new THREE.OrthographicCamera(
    -span*ratio/2,span*ratio/2,span/2,-span/2,.1,2400);
  camera.position.set(anchor.x,53,anchor.y);
  camera.up.set(0,1,0);
  camera.lookAt(focus.x,17,focus.y);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  let maxX=0,maxY=0;
  for(const p of points){
    for(const height of [4,23,40]){
      const v=new THREE.Vector3(p.x,height,p.y).project(camera);
      if(!Number.isFinite(v.x)||!Number.isFinite(v.y))return .65;
      maxX=Math.max(maxX,Math.abs(v.x));
      maxY=Math.max(maxY,Math.abs(v.y));
    }
  }
  const maxFit=Math.min(
    usableWidth/Math.max(.0001,maxX),
    usableHeight/Math.max(.0001,maxY));
  return Math.max(.65,Math.min(limit,maxFit*margin));
}
export function directorPerspectiveCovers(
  anchor:DirectorPoint,focus:DirectorPoint,
  points:readonly DirectorPoint[],aspect:number,fov:number,
  safeWidth=.87,safeHeight=.87
):boolean{
  if(!points.length)return true;
  const camera=new THREE.PerspectiveCamera(
    fov,Math.max(.42,aspect),.45,2400);
  camera.position.set(anchor.x,44,anchor.y);
  camera.up.set(0,1,0);
  camera.lookAt(focus.x,18,focus.y);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  for(const p of points)for(const height of [4,23,40]){
    const v=new THREE.Vector3(p.x,height,p.y).project(camera);
    if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||
      v.z<-1||v.z>1||
      Math.abs(v.x)>safeWidth||Math.abs(v.y)>safeHeight)return false;
  }
  return true;
}


/** R9 photographic assessment. All positions are projected through the
 * exact same cameras and heights as the replay renderer. The actor envelopes
 * are intentionally simple; this is not an animation/bone-space rig. */
export type DirectorCompositionTreatment='engage'|'follow'|'door'|'entry'|'settle'|'establish';
export type DirectorCompositionQuality={
  primaryReadable:boolean;targetReadable:boolean;shoulderReadable:boolean;
  targetOverlap:number;thirdsError:number;leadError:number;
  headroomError:number;score:number;shoulderSide:-1|0|1;
};
type Box={minX:number;maxX:number;minY:number;maxY:number};
type Projector={project:(x:number,y:number,z:number)=>THREE.Vector3;
  right:{x:number;y:number}};
function directorProjector(anchor:DirectorPoint,focus:DirectorPoint,
  aspect:number,baseSpan:number,zoom:number,fov:number,
  lens:'ortho'|'wide'):Projector{
  const ratio=Math.max(.42,aspect);
  const cam=lens==='wide'?
    new THREE.PerspectiveCamera(fov,ratio,.45,2400):
    new THREE.OrthographicCamera(
      -Math.max(200,baseSpan)*ratio/(2*Math.max(.65,zoom)),
      Math.max(200,baseSpan)*ratio/(2*Math.max(.65,zoom)),
      Math.max(200,baseSpan)/(2*Math.max(.65,zoom)),
      -Math.max(200,baseSpan)/(2*Math.max(.65,zoom)),.1,2400);
  cam.position.set(anchor.x,lens==='wide'?44:53,anchor.y);
  cam.up.set(0,1,0);
  cam.lookAt(focus.x,lens==='wide'?18:17,focus.y);
  cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  const right={x:cam.matrixWorld.elements[0],y:cam.matrixWorld.elements[2]};
  return {project:(x,y,z)=>new THREE.Vector3(x,y,z).project(cam),right};
}
function bodyBounds(projector:Projector,p:DirectorPoint,
  radii:readonly [number,number,number]):Box{
  const box={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(const [i,height] of [5,22,37].entries()){
    for(const side of [-1,1]){
      const v=projector.project(p.x+projector.right.x*radii[i]*side,
        height,p.y+projector.right.y*radii[i]*side);
      box.minX=Math.min(box.minX,v.x);box.maxX=Math.max(box.maxX,v.x);
      box.minY=Math.min(box.minY,v.y);box.maxY=Math.max(box.maxY,v.y);
    }
  }
  return box;
}
const boxArea=(b:Box)=>Math.max(0,b.maxX-b.minX)*Math.max(0,b.maxY-b.minY);
function boxOverlap(a:Box,b:Box):number{
  return Math.max(0,Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX))*
    Math.max(0,Math.min(a.maxY,b.maxY)-Math.max(a.minY,b.minY));
}
export function directorCompositionQuality(
  anchor:DirectorPoint,focus:DirectorPoint,operator:DirectorPoint,
  target:DirectorPoint|null,direction:DirectorPoint,
  treatment:DirectorCompositionTreatment,
  lens:'ortho'|'wide',aspect:number,baseSpan:number,zoom:number,fov:number,
  safeWidth=.78,safeHeight=.76
):DirectorCompositionQuality{
  const project=directorProjector(anchor,focus,aspect,baseSpan,zoom,fov,lens);
  const primary=bodyBounds(project,operator,[11,13,8]);
  const op=project.project(operator.x,22,operator.y);
  const mag=Math.hypot(direction.x,direction.y);
  const dir=mag>.01?{x:direction.x/mag,y:direction.y/mag}:{x:1,y:0};
  const ahead=project.project(operator.x+dir.x*50,22,operator.y+dir.y*50);
  const screenDir=ahead.x-op.x;
  const desiredX=screenDir>.02?-.32:screenDir<-.02?.32:0;
  const pCenter=(primary.minX+primary.maxX)*.5;
  const thirdsError=Math.min(1,Math.abs(pCenter-desiredX));
  const headroomError=Math.min(1,Math.abs(primary.minY+safeHeight*.72)/Math.max(.2,safeHeight));
  const leadError=screenDir>.02?
    Math.max(0,pCenter+.12):screenDir<-.02?
      Math.max(0,.12-pCenter):0;
  const primaryReadable=Number.isFinite(pCenter)&&
    primary.minX>=-safeWidth&&primary.maxX<=safeWidth&&
    primary.minY>=-safeHeight&&primary.maxY<=safeHeight;
  let targetReadable=true,targetOverlap=0;
  if(target){
    const tBox=bodyBounds(project,target,[8,10,7]);
    const tCenter=project.project(target.x,22,target.y);
    const inFrame=tBox.minX>=-safeWidth&&tBox.maxX<=safeWidth&&
      tBox.minY>=-safeHeight&&tBox.maxY<=safeHeight&&
      tCenter.z>=-1&&tCenter.z<=1;
    targetOverlap=boxOverlap(primary,tBox)/Math.max(.00001,boxArea(tBox));
    const centerBlocked=tCenter.x>=primary.minX&&tCenter.x<=primary.maxX&&
      tCenter.y>=primary.minY&&tCenter.y<=primary.maxY;
    targetReadable=inFrame&&targetOverlap<=.30&&!centerBlocked&&
      Math.abs(tCenter.x-op.x)>=.095;
  }
  const axis=dir.x*(anchor.y-operator.y)-dir.y*(anchor.x-operator.x);
  const shoulderSide: -1|0|1=Math.abs(axis)<2?0:axis>0?1:-1;
  const behind=(anchor.x-operator.x)*dir.x+
    (anchor.y-operator.y)*dir.y;
  const lateral=Math.abs(axis);
  const shoulderReadable=!!target&&targetReadable&&behind<0&&
    lateral>=16&&lateral<=60;
  const action=treatment==='engage'||treatment==='door'||treatment==='entry';
  const thirdsWeight=action?8:treatment==='follow'?13:3;
  const leadWeight=treatment==='follow'?15:action?6:2;
  const headWeight=treatment==='follow'?3:2;
  // This is a bounded aesthetic preference, never a replacement for
  // physical legality, essential visibility, or story continuity.
  const score=100-
    thirdsError*thirdsWeight-leadError*leadWeight-
    headroomError*headWeight-
    (target?targetOverlap*18:0)-
    (target&&!targetReadable?44:0)-
    (target&&shoulderReadable&&treatment==='engage'?-5:0);
  return {primaryReadable,targetReadable,shoulderReadable,
    targetOverlap,thirdsError,leadError,headroomError,
    score,shoulderSide};
}
