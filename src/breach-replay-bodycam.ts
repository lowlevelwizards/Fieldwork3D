/** Replay R4.3: read-only body-mounted camera from the EXISTING posed rig.
 * - Legacy rig anatomy is +X forward; world uses THREE's standard +Y up.
 * - No simulation sampling, AI or hindsight camera target selection.
 * - No render-history smoothing: arbitrary seek = same camera every time.
 */
import * as THREE from 'three';

export type BodycamMount='chest'|'helmet';
export type BodycamStabilization='natural'|'balanced'|'steady';
export type BodycamSetting={
  actorId:string;mount:BodycamMount;
  stabilization:BodycamStabilization;fov:number;
};
export type BodycamSample={
  position:THREE.Vector3;forward:THREE.Vector3;up:THREE.Vector3;
};
const UP=new THREE.Vector3(0,1,0);
const FORWARD=new THREE.Vector3(1,0,0);
export const bodycamFieldOfView=(fov:number)=>
  Number.isFinite(fov)?THREE.MathUtils.clamp(fov,70,110):95;
export function sampleBodycamSocket(
  socket:THREE.Object3D,stabilization:BodycamStabilization,
  downwardCant=0
):BodycamSample{
  socket.updateWorldMatrix(true,false);
  const position=new THREE.Vector3().setFromMatrixPosition(socket.matrixWorld);
  const forward=FORWARD.clone().transformDirection(socket.matrixWorld);
  const naturalUp=UP.clone().transformDirection(socket.matrixWorld);
  const levelUp=UP.clone().addScaledVector(forward,-UP.dot(forward));
  // A downed operator can look nearly straight up/down. Handle that
  // degenerate horizon without introducing seek-dependent orientation.
  if(levelUp.lengthSq()<.001)
    levelUp.set(0,0,1).addScaledVector(forward,-forward.z);
  levelUp.normalize();
  const weight=stabilization==='natural'?0:
    stabilization==='balanced'?.6:1;
  const up=naturalUp.lerp(levelUp,weight);
  up.addScaledVector(forward,-up.dot(forward));
  if(up.lengthSq()<.001)up.copy(levelUp);
  up.normalize();
  // Body-mounted cameras are normally canted slightly toward hands and
  // doorway thresholds. Pitch follows the actual posed chest/head frame;
  // never turn toward a hidden enemy or a future incident.
  const cant=Number.isFinite(downwardCant)?
    THREE.MathUtils.clamp(downwardCant,0,.35):0;
  if(cant<=0)return {position,forward,up};
  const aimed=forward.clone().addScaledVector(up,-Math.tan(cant)).normalize();
  const frameUp=up.clone().addScaledVector(aimed,-up.dot(aimed)).normalize();
  return {position,forward:aimed,up:frameUp};
}
export function applyBodycamCamera(
  camera:THREE.PerspectiveCamera,sample:BodycamSample,
  fov:number,aspect:number
):void{
  const safeFov=bodycamFieldOfView(fov);
  const safeAspect=Number.isFinite(aspect)&&aspect>0?
    THREE.MathUtils.clamp(aspect,.25,5):1;
  if(camera.fov!==safeFov||camera.aspect!==safeAspect){
    camera.fov=safeFov;camera.aspect=safeAspect;
    camera.updateProjectionMatrix();
  }
  camera.position.copy(sample.position);
  camera.up.copy(sample.up);
  camera.lookAt(sample.position.clone().add(sample.forward));
  camera.updateMatrixWorld(true);
}
