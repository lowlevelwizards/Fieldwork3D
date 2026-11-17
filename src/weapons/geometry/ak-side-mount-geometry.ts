/** M2.3 — stylized receiver-side AK dovetail and side-to-top optic bridge.
 * These are exterior visual forms, NOT mechanical installation instructions.
 * The same authored landmarks drive part mount surfaces and the fit preview.
 * One merged low-poly material/mesh per visible component, built only on
 * weapon configuration changes; no small screws, pins, rail teeth or shaders.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {AK_BLACK_METAL} from './weapon-visual-palette.ts';

export const AK_SIDE_MOUNT_ART=Object.freeze({
 // Receiver (left side = -Z). The rail stays on the outer stamped face.
 centerX:-1.80,centerY:-.07,centerZ:-2.24,
 length:5.70,
 contactY:-.07,contactZ:-2.54,
 startX:-4.65,endX:1.05,
 // Distinct aft, elevated adapter bridge. It sits above the dust cover,
 // not on it; this is deliberately a rear optic position.
 bridgeCenterX:-2.02,bridgeCenterY:3.12,
 bridgeLength:7.40,bridgeWidth:2.42,bridgeHeight:.48,
 bridgeTopY:3.36,
 bridgeStartX:-5.72,bridgeEndX:1.68
});

function block(x:number,y:number,z:number,
 w:number,h:number,d:number):THREE.BufferGeometry{
 const mesh=new THREE.BoxGeometry(w,h,d);
 mesh.translate(x,y,z);return mesh;
}
function merged(name:string,geometries:THREE.BufferGeometry[],
 root:THREE.Group):THREE.Mesh{
 // One draw call per receiver rail / adapter; no duplicate coplanar faces
 // are exposed at the intended mounting/contact silhouettes.
 const normalized=geometries.map(g=>g.index?g.toNonIndexed():g);
 const geometry=mergeGeometries(normalized,false);
 for(const g of new Set([...geometries,...normalized]))g.dispose();
 if(!geometry)throw new Error('AK side mounting geometry merge failed: '+name);
 const mesh=new THREE.Mesh(geometry,AK_BLACK_METAL);
 mesh.name=name;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}

/** A single robust bar with two big outer angled shoulders, not a generic
 * rail magically spawned on wooden furniture. Attach only when the selected
 * receiver's catalog entry declares the side-dovetail mount standard.
 */
export function addAKReceiverSideDovetail(root:THREE.Group):void{
 const a=AK_SIDE_MOUNT_ART;
 const plate=block(a.centerX,a.centerY,a.centerZ+.22,a.length,.77,.38);
 // Two long, obvious lips read as the Russian side mount at gameplay scale.
 const upper=block(a.centerX,a.centerY+.33,a.centerZ-.06,a.length-.26,.34,.50);
 const lower=block(a.centerX,a.centerY-.33,a.centerZ-.06,a.length-.26,.34,.50);
 const mesh=merged('family-art-ak-side-dovetail',[plate,upper,lower],root);
 mesh.userData.akReceiverSideDovetail=true;
 mesh.userData.akDovetailContactZ=a.contactZ;
}

/** Only called when the player has actually installed the side-to-Picatinny
 * adapter. Side clamp, a prominent offset rising bracket, and rear upper
 * bridge are one readable silhouette / one shared-material draw call.
 * The bridge's art-local top plane is the sole upper optic support surface.
 */
export function addAKSidePicatinnyAdapter(root:THREE.Group):void{
 const a=AK_SIDE_MOUNT_ART;
 const components=[
  // Clamps overlap the receiver-owned rail without floating on its edge.
  block(-1.80,-.07,-2.67,4.95,1.08,.56),
  // Rearward side tower and substantial offset elbow.
  block(-2.93,1.34,-2.79,1.34,2.25,.72),
  block(-1.46,2.44,-1.90,3.35,.69,1.74),
  // A single, thick upper rail (no microscopic repeated teeth).
  block(a.bridgeCenterX,a.bridgeCenterY,0,
   a.bridgeLength,a.bridgeHeight,a.bridgeWidth),
  // One broad, visible raised side wall to emphasize the asymmetric mount.
  block(-4.40,2.86,-1.05,1.18,.45,.67)
 ];
 const mesh=merged('family-art-ak-side-picatinny-adapter',components,root);
 mesh.userData.akSidePicatinnyAdapter=true;
 mesh.userData.akSidePicatinnySupportTopY=a.bridgeTopY;
}
