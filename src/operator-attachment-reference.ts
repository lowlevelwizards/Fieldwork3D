/** BT3R.6: native game-art dimensions, never the scaled carry proxies.
 * Primary sample uses the same silhouette definition as the held rifle.
 * Sidearm sample retains the existing operator secondary scale.
 */
import * as THREE from 'three';
import {arMagazineCurve,arMagazineOutline} from './weapons/geometry/ar-magazine-profiles.ts';
export const SIDEARM_OPERATOR_SCALE=.37;
export function nativePrimaryMagazine(short=false){
 const c=arMagazineCurve(short?'20':'30'),outline=arMagazineOutline(c);
 const shape=new THREE.Shape();shape.moveTo(...outline[0]);
 for(const p of outline.slice(1))shape.lineTo(...p);
 shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:c.depth,bevelEnabled:false,steps:1,curveSegments:1});
 g.computeBoundingBox();const b=g.boundingBox!,center=b.getCenter(new THREE.Vector3());
 g.translate(-center.x,-b.max.y,-center.z);g.computeBoundingBox();
 return g;
}
export function nativePrimaryMagazineSize(short=false){
 const g=nativePrimaryMagazine(short),size=g.boundingBox!.getSize(new THREE.Vector3());g.dispose();return size;
}
