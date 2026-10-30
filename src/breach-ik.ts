/** Pure two-link IK used by the articulated operator rig. */
import * as THREE from 'three';
const axisY=new THREE.Vector3(0,1,0);
export function twoBoneJoint(start:THREE.Vector3,end:THREE.Vector3,
  upper:number,lower:number,pole:THREE.Vector3,out=new THREE.Vector3()){
  const delta=end.clone().sub(start),raw=delta.length();
  const reach=Math.max(.001,Math.min(raw,upper+lower-.001));
  const axis=delta.normalize();
  const along=(upper*upper+reach*reach-lower*lower)/(2*reach);
  const height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
  if(bend.lengthSq()<.01)bend.set(0,0,1);
  return out.copy(start).addScaledVector(axis,along).addScaledVector(bend,height);
}
export function alignSegment(mesh:THREE.Object3D,
  from:THREE.Vector3,to:THREE.Vector3){
  const direction=to.clone().sub(from);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(axisY,direction.clone().normalize());
  mesh.scale.y=direction.length();
}
