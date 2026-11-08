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
