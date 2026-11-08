/** R8 single optical framing evaluator, shared by composer and rail.
 * Measures the actual ORTHO camera projected by Three.js, not a separate
 * yaw/pitch approximation. The returned zoom fits the required subjects,
 * including head/feet envelope, within the selected usable viewport.
 */
import * as THREE from 'three';
export type DirectorPoint={x:number;y:number};
/** NDC bounds of the truly visible film stage (headers and playback dock
 * are excluded). The defaults remain symmetric for non-replay callers. */
export type DirectorSafeFrame={
  left:number;right:number;top:number;bottom:number;
};
export function directorReplaySafeFrame(width:number,height:number,
  topObscuredPx:number,bottomObscuredPx:number):DirectorSafeFrame{
  const w=Math.max(200,width),h=Math.max(200,height);
  const side=w<520?.79:.88;
  const top= Math.max(.36,Math.min(.89,1-2*(topObscuredPx+12)/h));
  const bottom=Math.min(.08,Math.max(-.86,
    -1+2*(bottomObscuredPx+16)/h));
  return {left:-side,right:side,top:Math.max(bottom+.30,top),bottom};
}
const inSafeFrame=(x:number,y:number,frame:DirectorSafeFrame)=>
  Number.isFinite(x)&&Number.isFinite(y)&&
  x>=frame.left&&x<=frame.right&&
  y>=frame.bottom&&y<=frame.top;
export function directorOrthoFittingZoom(
  anchor:DirectorPoint,focus:DirectorPoint,
  points:readonly DirectorPoint[],aspect:number,baseSpan:number,
  usableWidth=.78,usableHeight=.76,
  limit=8.0,margin=.81,safeFrame?:DirectorSafeFrame
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
  let maxX=0,maxY=0,frameFit=Infinity;
  for(const p of points){
    for(const height of [4,23,40]){
      const v=new THREE.Vector3(p.x,height,p.y).project(camera);
      if(!Number.isFinite(v.x)||!Number.isFinite(v.y))return .65;
      maxX=Math.max(maxX,Math.abs(v.x));
      maxY=Math.max(maxY,Math.abs(v.y));
      if(safeFrame){
        // Orthographic projected coordinates scale linearly with zoom.
        // Each edge constrains zoom independently, protecting a screen
        // whose upper mission header and lower replay dock are asymmetric.
        const bounds=[
          v.x>0?safeFrame.right/v.x:Infinity,
          v.x<0?safeFrame.left/v.x:Infinity,
          v.y>0?safeFrame.top/v.y:Infinity,
          v.y<0?safeFrame.bottom/v.y:Infinity];
        frameFit=Math.min(frameFit,...bounds.filter(n=>n>=0));
      }
    }
  }
  const maxFit=safeFrame?frameFit:Math.min(
    usableWidth/Math.max(.0001,maxX),
    usableHeight/Math.max(.0001,maxY));
  return Math.max(.65,Math.min(limit,maxFit*margin));
}
export function directorPerspectiveCovers(
  anchor:DirectorPoint,focus:DirectorPoint,
  points:readonly DirectorPoint[],aspect:number,fov:number,
  safeWidth=.87,safeHeight=.87,safeFrame?:DirectorSafeFrame
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
      (safeFrame?!inSafeFrame(v.x,v.y,safeFrame):
        Math.abs(v.x)>safeWidth||Math.abs(v.y)>safeHeight))return false;
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
  safeWidth=.78,safeHeight=.76,safeFrame?:DirectorSafeFrame,
  foregroundActors:readonly DirectorPoint[]=[]
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
  const top=safeFrame?.top??safeHeight;
  const bottom=safeFrame?.bottom??-safeHeight;
  const left=safeFrame?.left??-safeWidth;
  const right=safeFrame?.right??safeWidth;
  const headroomError=Math.min(1,
    Math.abs(primary.maxY-(top-.18*(top-bottom)))/
    Math.max(.2,top-bottom));
  const leadError=screenDir>.02?
    Math.max(0,pCenter+.12):screenDir<-.02?
      Math.max(0,.12-pCenter):0;
  const primaryReadable=Number.isFinite(pCenter)&&
    primary.minX>=left&&primary.maxX<=right&&
    primary.minY>=bottom&&primary.maxY<=top;
  let targetReadable=true,targetOverlap=0;
  if(target){
    const tBox=bodyBounds(project,target,[8,10,7]);
    const tCenter=project.project(target.x,22,target.y);
    const inFrame=tBox.minX>=left&&tBox.maxX<=right&&
      tBox.minY>=bottom&&tBox.maxY<=top&&
      tCenter.z>=-1&&tCenter.z<=1;
    // Every friendly that actually sits BETWEEN the camera and target
    // is an occluder. Two bodies at the same screen position must never
    // count as a successful two-shot simply because the target's world
    // coordinate is technically in the lens.
    const targetDepth=Math.hypot(target.x-anchor.x,target.y-anchor.y);
    const blockers=[operator,...foregroundActors.filter(p=>
      Math.hypot(p.x-operator.x,p.y-operator.y)>1)];
    let occludedArea=0,centerBlocked=false;
    for(const body of blockers){
      const distance=Math.hypot(body.x-anchor.x,body.y-anchor.y);
      if(distance>=targetDepth-5)continue;
      const b=bodyBounds(project,body,[11,13,8]);
      occludedArea+=boxOverlap(b,tBox)/Math.max(.00001,boxArea(tBox));
      if(tCenter.x>=b.minX&&tCenter.x<=b.maxX&&
         tCenter.y>=b.minY&&tCenter.y<=b.maxY)centerBlocked=true;
    }
    targetOverlap=Math.min(1,occludedArea);
    targetReadable=inFrame&&targetOverlap<=.23&&!centerBlocked&&
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


/** Projected, bounded foreground surfaces. Screen coverage complements
 * sample-ray subject visibility: a camera next to an open opaque leaf may
 * technically see a shoulder, yet frame little besides the door itself.
 * A piece of framing architecture is fine; a full-screen leaf is not. */
export type DirectorForegroundSegment={
  a:DirectorPoint;b:DirectorPoint;height:number;
  kind:'door'|'wall'|'furniture';
};
export type DirectorForegroundOccupancy={
  door:number;wall:number;furniture:number;subjectMask:number;
};
export function directorForegroundOccupancy(
  anchor:DirectorPoint,focus:DirectorPoint,operator:DirectorPoint,
  surfaces:readonly DirectorForegroundSegment[],
  lens:'ortho'|'wide',aspect:number,baseSpan:number,zoom:number,fov:number,
  safeFrame:DirectorSafeFrame={left:-.85,right:.85,top:.81,bottom:-.81}
):DirectorForegroundOccupancy{
  const project=directorProjector(anchor,focus,aspect,baseSpan,zoom,fov,lens);
  const body=bodyBounds(project,operator,[11,13,8]);
  const bodySize=Math.max(.0001,boxArea(body));
  const canvas={minX:safeFrame.left,maxX:safeFrame.right,
    minY:safeFrame.bottom,maxY:safeFrame.top};
  const canvasSize=Math.max(.0001,boxArea(canvas));
  const result:DirectorForegroundOccupancy={
    door:0,wall:0,furniture:0,subjectMask:0};
  const subjectDist=Math.hypot(operator.x-anchor.x,operator.y-anchor.y);
  for(const surface of surfaces){
    const mx=(surface.a.x+surface.b.x)*.5,
      my=(surface.a.y+surface.b.y)*.5;
    // Only optical foreground surfaces matter. Walls behind the cast
    // give the shot context and should never be penalized.
    if(Math.hypot(mx-anchor.x,my-anchor.y)>subjectDist+3)continue;
    const world=[surface.a,surface.b];
    const screen:Box={minX:Infinity,maxX:-Infinity,
      minY:Infinity,maxY:-Infinity};
    let near=0;
    for(const p of world)for(const h of [0,surface.height]){
      const projected=project.project(p.x,h,p.y);
      if(projected.z < -1||projected.z > 1.02)continue;
      near++;
      screen.minX=Math.min(screen.minX,projected.x);
      screen.maxX=Math.max(screen.maxX,projected.x);
      screen.minY=Math.min(screen.minY,projected.y);
      screen.maxY=Math.max(screen.maxY,projected.y);
    }
    if(near<3)continue;
    const clipped=boxOverlap(screen,canvas)/canvasSize;
    const coveredActor=boxOverlap(screen,body)/bodySize;
    result[surface.kind]=Math.max(result[surface.kind],
      Math.min(1,clipped));
    result.subjectMask=Math.max(result.subjectMask,
      Math.min(1,coveredActor));
  }
  return result;
}
