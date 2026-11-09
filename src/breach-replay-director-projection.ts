/** R8 single optical framing evaluator, shared by composer and rail.
 * Measures the actual ORTHO camera projected by Three.js, not a separate
 * yaw/pitch approximation. The returned zoom fits the required subjects,
 * including head/feet envelope, within the selected usable viewport.
 */
import * as THREE from 'three';
import type {DirectorActionLine} from './breach-replay-director-action.ts';

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
  /** Fraction of the actor envelope within the playable camera frame. */
  primaryCoverage:number;
  targetOverlap:number;thirdsError:number;leadError:number;
  headroomError:number;score:number;shoulderSide:-1|0|1;
  /** Actual projected horizontal clearance (NDC), not world LOS. */
  targetHorizontalGap:number;primaryScreenX:number;
  targetScreenX:number|null;
};
type Box={minX:number;maxX:number;minY:number;maxY:number};
type Projector={project:(x:number,y:number,z:number)=>THREE.Vector3;
  /** Positive world-distance along optical depth for both lens types. */
  depth:(x:number,y:number,z:number)=>number;
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
  return {project:(x,y,z)=>new THREE.Vector3(x,y,z).project(cam),
    depth:(x,y,z)=>-new THREE.Vector3(x,y,z)
      .applyMatrix4(cam.matrixWorldInverse).z,right};
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
  const primary=bodyBounds(project,operator,[15,17,11]);
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
  const viewport={minX:left,maxX:right,minY:bottom,maxY:top};
  const primaryCoverage=Number.isFinite(pCenter)&&op.z>=-1&&op.z<=1?
    Math.min(1,boxOverlap(primary,viewport)/
      Math.max(.00001,boxArea(primary))):0;
  const primaryReadable=Number.isFinite(pCenter)&&
    primary.minX>=left&&primary.maxX<=right&&
    primary.minY>=bottom&&primary.maxY<=top;
  let targetReadable=true,targetOverlap=0;
  let targetHorizontalGap=0,targetScreenX:number|null=null;
  if(target){
    // Chunky low-poly backpacks and weapons reach past the slender
    // nominal human torso: use a conservative silhouette for overlap.
    const tBox=bodyBounds(project,target,[9,12,9]);
    const tCenter=project.project(target.x,22,target.y);
    targetScreenX=tCenter.x;
    const inFrame=tBox.minX>=left&&tBox.maxX<=right&&
      tBox.minY>=bottom&&tBox.maxY<=top&&
      tCenter.z>=-1&&tCenter.z<=1;
    // Every friendly that actually sits BETWEEN the camera and target
    // is an occluder. Two bodies at the same screen position must never
    // count as a successful two-shot simply because the target's world
    // coordinate is technically in the lens.
    // Camera projection depth, not flat-ground radial distance: ORTHO
    // looks downward, so Euclidean radius can reverse the draw order.
    const targetDepth=project.depth(target.x,22,target.y);
    const blockers=[operator,...foregroundActors.filter(p=>
      Math.hypot(p.x-operator.x,p.y-operator.y)>1)];
    let occludedArea=0,centerBlocked=false;
    for(const body of blockers){
      const depth=project.depth(body.x,22,body.y);
      if(depth>=targetDepth-2)continue;
      const b=bodyBounds(project,body,[15,17,11]);
      occludedArea+=boxOverlap(b,tBox)/Math.max(.00001,boxArea(tBox));
      if(tCenter.x>=b.minX&&tCenter.x<=b.maxX&&
         tCenter.y>=b.minY&&tCenter.y<=b.maxY)centerBlocked=true;
    }
    targetOverlap=Math.min(1,occludedArea);
    // The front operator and target must be separate in SCREEN SPACE.
    // Vertical displacement from the top-down pitch is not enough:
    // a same-column target still disappears behind the backpack.
    targetHorizontalGap=Math.max(0,
      tBox.minX-primary.maxX,primary.minX-tBox.maxX);
    const minGap=(right-left)*.035;
    targetReadable=inFrame&&targetOverlap<=.18&&!centerBlocked&&
      targetHorizontalGap>=minGap&&
      Math.abs(tCenter.x-op.x)>=(right-left)*.145;
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
  const contact=treatment==='engage';
  // A central backpack is a *bad contact photograph* even before the
  // enemy's recorded coordinates become discloseable in pre-roll.
  const centeredShooter=contact?
    Math.max(0,(right-left)*.15-Math.abs(pCenter))/
      Math.max(.1,right-left):0;
  const score=100-
    thirdsError*thirdsWeight-leadError*leadWeight-
    headroomError*headWeight-
    (target?targetOverlap*18:0)-
    (target&&!targetReadable?55:0)-
    centeredShooter*170+
    (target&&targetReadable?18:0)+
    (target&&shoulderReadable&&contact?5:0);
  return {primaryReadable,targetReadable,shoulderReadable,
    primaryCoverage,targetOverlap,thirdsError,leadError,headroomError,
    score,shoulderSide,targetHorizontalGap,primaryScreenX:pCenter,
    targetScreenX};
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


/** A bounded visual bonus for a RECORDED exchange: both the firing
 * muzzle and impact side should be photographically readable. Never
 * evaluates unknown actors, creates shots, or overrides legal geometry. */
export function directorProjectedActionVisibility(
  anchor:DirectorPoint,focus:DirectorPoint,
  lines:readonly DirectorActionLine[],
  lens:'ortho'|'wide',aspect:number,baseSpan:number,zoom:number,fov:number,
  safeFrame?:DirectorSafeFrame
):number{
  if(!lines.length)return 0;
  const project=directorProjector(anchor,focus,aspect,baseSpan,zoom,fov,lens);
  const bounds=safeFrame??{left:-.78,right:.78,top:.76,bottom:-.76};
  const fits=(x:number,y:number,z:number)=>{
    const p=project.project(x,y,z);
    return p.z>=-1&&p.z<=1&&p.x>=bounds.left&&p.x<=bounds.right&&
      p.y>=bounds.bottom&&p.y<=bounds.top;
  };
  let best=0;
  for(const line of lines){
    const muzzle=fits(line.start.x,20,line.start.y);
    const impact=fits(line.end.x,12,line.end.y);
    const value=muzzle&&impact?(line.hit?1:.85):
      muzzle||impact?.22:0;
    best=Math.max(best,value);
  }
  return best;
}


/** Is the actual attention destination legible inside the playable screen?
 * Unlike required actor bounds, this is a DISCOVERY interest point and may
 * be a look through a doorway. This never reveals hidden game entities. */
export function directorAttentionVisible(
  anchor:DirectorPoint,focus:DirectorPoint,attention:DirectorPoint,
  lens:'ortho'|'wide',aspect:number,baseSpan:number,zoom:number,fov:number,
  safeFrame?:DirectorSafeFrame
):boolean{
  const project=directorProjector(anchor,focus,aspect,baseSpan,zoom,fov,lens);
  const p=project.project(attention.x,19,attention.y);
  const frame=safeFrame??{left:-.78,right:.78,top:.76,bottom:-.76};
  const margin=.07;
  return p.z>=-1&&p.z<=1&&
    p.x>=frame.left+margin&&p.x<=frame.right-margin&&
    p.y>=frame.bottom+margin&&p.y<=frame.top-margin;
}
