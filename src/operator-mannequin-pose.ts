/** Stage 1B mannequin-only posing. Combat pose/movement/footstep targets
 * remain authoritative. This gives the unarmed Lab a true neutral reference
 * without moving contacts, changing limb lengths or modifying IK solvers.
 * Coordinates are legacy chest +X forward; renderer adapter is unchanged.
 */
import * as THREE from 'three';
import {LEG_REST_RISE,legRestRise} from './breach-leg-geometry.ts';
/** Compatibility wrapper for the now-shared operator rest-pose calibration. */
export const NEUTRAL_MANNEQUIN_HIP_RISE=LEG_REST_RISE;
export const neutralMannequinHipRise=legRestRise;
export function neutralMannequinWrist(side:-1|1):THREE.Vector3{
 // Shoulder is (1,4,side*7): near full arm extension, mild wrist offset
 // and no 'gripping an invisible rifle' forward reach.
 return new THREE.Vector3(.30,-14.75,side*8.55);
}
export function neutralMannequinElbowPole(side:-1|1):THREE.Vector3{
 // Shoulder-relative, rearward and slightly OUTWARD. The previous
 // weapon-specific elbow corridor was forcing odd backward elbows
 // when holding no weapon. Do not push joints through the torso.
 return new THREE.Vector3(-2.7,-7.0,side*1.25);
}
