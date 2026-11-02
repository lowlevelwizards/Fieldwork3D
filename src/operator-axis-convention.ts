/** Operator coordinate contract (Three.js-compatible, v2).
 *
 * Public/authoring space:
 *   +Y up, -Z forward (face / muzzle), +X character right.
 *   A positive game heading still points toward world (+cos h, +sin h)
 *   on the ground X/Z plane. Never reinterpret a tactical map heading.
 *
 * Older Fieldwork meshes, weapon grip coordinates and the IK solver were
 * authored with +X forward, +Z to the character's right. Keep that solver
 * intact behind a fixed +90 degree Y legacy frame. The public root quaternion
 * cancels it, reproducing the EXACT same world transform, even when wounded
 * pitch/roll is present. Future geometry may be authored in -Z space.
 */
import * as THREE from 'three';
export const OPERATOR_FORWARD=new THREE.Vector3(0,0,-1);
export const OPERATOR_RIGHT=new THREE.Vector3(1,0,0);
export const OPERATOR_UP=new THREE.Vector3(0,1,0);
export const LEGACY_OPERATOR_FORWARD=new THREE.Vector3(1,0,0);
export const LEGACY_FRAME_YAW=Math.PI/2;
const inverseAdapter=new THREE.Quaternion()
 .setFromAxisAngle(OPERATOR_UP,-LEGACY_FRAME_YAW);
export const canonicalRootYawFromLegacy=(yaw:number)=>yaw-LEGACY_FRAME_YAW;
export const legacyYawFromHeading=(heading:number)=>-heading;
export function canonicalRootOrientation(
 pitch:number,legacyYaw:number,roll:number,
 out=new THREE.Quaternion()
):THREE.Quaternion{
 return out.setFromEuler(new THREE.Euler(pitch,legacyYaw,roll,'XYZ'))
   .multiply(inverseAdapter);
}
/** Canonical local -Z becomes the old +X in any legacy attachment's space. */
export function createCanonicalAttachment(parent:THREE.Object3D):THREE.Group{
 const group=new THREE.Group();
 group.name='canonical-minus-Z-forward';
 group.rotation.y=-LEGACY_FRAME_YAW;
 parent.add(group);
 return group;
}
/** Explicitly label a legacy-local point before converting it for new models. */
export function legacyPointToCanonical(v:THREE.Vector3,
 out=new THREE.Vector3()):THREE.Vector3{
 return out.copy(v).applyAxisAngle(OPERATOR_UP,-LEGACY_FRAME_YAW);
}
export function canonicalPointToLegacy(v:THREE.Vector3,
 out=new THREE.Vector3()):THREE.Vector3{
 return out.copy(v).applyAxisAngle(OPERATOR_UP,LEGACY_FRAME_YAW);
}
