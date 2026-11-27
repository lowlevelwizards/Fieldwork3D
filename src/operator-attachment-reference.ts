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

import {carriedMagazineGeometry} from './operator-carried-magazines.ts';
/** Full-size family art, retaining all existing carry-proxy callers unchanged. */
export function nativeEquippedMagazine(part:string){
 const g=carriedMagazineGeometry(part,true);if(!g)return null;
 g.computeBoundingBox();const b=g.boundingBox!,center=b.getCenter(new THREE.Vector3());
 g.translate(-center.x,-b.max.y,-center.z);g.computeBoundingBox();return g;
}

import {glockMagazineArtDimensions,type GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
/** Shared floorplate artwork; the concealed body is an abstracted insertable envelope. */
export function nativeSecondaryMagazineSize(id:GlockAppearanceId){
 const a=glockMagazineArtDimensions(id),s=SIDEARM_OPERATOR_SCALE;
 return {width:a.bodyWidth*s,height:(a.bodyHeight+a.plateHeight)*s,depth:a.bodyDepth*s};
}
export function nativeSecondaryMagazine(id:GlockAppearanceId,bodyMaterial:THREE.Material,plateMaterial:THREE.Material){
 const a=glockMagazineArtDimensions(id),s=SIDEARM_OPERATOR_SCALE,g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(a.bodyWidth*s,a.bodyHeight*s,a.bodyDepth*s),bodyMaterial);
 body.position.y=-(a.bodyHeight/2+a.plateHeight)*s;body.name='native-secondary-magazine-body';
 const base=new THREE.Mesh(new THREE.BoxGeometry(a.plateWidth*s,a.plateHeight*s,a.plateDepth*s),plateMaterial);
 base.position.y=-a.plateHeight*s/2;base.name='native-secondary-magazine-baseplate';
 for(const m of [body,base]){m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;
}
