import * as THREE from 'three';

/** Very low-poly authored primitives; no imported models or procedural
 * leaf litter. Dimensions are in local metres, scaled by each plant.
 * Crown lobes overlap a central crown rather than floating separately.
 */
export type WoodyGeometry={
  trunk:THREE.CylinderGeometry;branch:THREE.CylinderGeometry;
  crown:THREE.IcosahedronGeometry;
  crownLobe:THREE.IcosahedronGeometry;
  shrubStem:THREE.CylinderGeometry;
  shrubCrown:THREE.DodecahedronGeometry;
};
export function createWoodyGeometry():WoodyGeometry{
  return {
    trunk:new THREE.CylinderGeometry(.046,.075,1,6),
    branch:new THREE.CylinderGeometry(.017,.027,1,5),
    crown:new THREE.IcosahedronGeometry(.47,0),
    crownLobe:new THREE.IcosahedronGeometry(.31,0),
    shrubStem:new THREE.CylinderGeometry(.014,.027,1,5),
    shrubCrown:new THREE.DodecahedronGeometry(.19,0),
  };
}
