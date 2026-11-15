/** FAL P6 shape hierarchy and actual emitted triangle budget.
 * Intentionally evaluates complete real Three.js geometries (including
 * extrusions, receiver details and accessories) rather than mesh counts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_UPPER_STATIONS} from '../src/weapons/geometry/fal-receiver-form.ts';
import {FAL_HANDGUARD_STATIONS,falHandguardSideHalfZAt}
 from '../src/weapons/geometry/fal-handguard-profiles.ts';
const make=()=>{
 const m=new THREE.MeshBasicMaterial();
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
 return {m,root:buildWeaponSilhouette('rifle',m,m,c)};
};
test('P6 measured budget: substantial reduction from the 686-triangle P5 model',()=>{
 const all=buildAuditReport(),fal=all.find(x=>x.name==='FAL');
 const g3=all.find(x=>x.name==='G3A3'),ak=all.find(x=>x.name==='AKM');
 assert.ok(fal&&g3&&ak);
 console.log('FAL P6 ACTUAL POLY COMPARISON',JSON.stringify(all));
 assert.ok(fal.triangles<=520,'remodeled FAL should be near G3 economy');
 assert.ok(fal.triangles<=686*.77,'reduce total P5 geometry by at least 23%');
 assert.ok(fal.triangles<=g3.triangles+40,
  'simplified FAL must approach its closest visual neighbor');
 assert.ok(fal.meshes<=25);
 assert.ok(fal.byPart.receiver.triangles<=260,
  'receiver details cannot dominate the whole rifle geometry budget');
});
test('P6 clear six-point silhouette crowns have fewer strips and no little underside bevels',()=>{
 const {m,root}=make();
 assert.equal(FAL_UPPER_STATIONS.length,4);
 assert.equal(FAL_HANDGUARD_STATIONS.length,4);
 const upper=root.children.find(x=>x.userData.falCrownedUpper);
 const hand=root.children.find(x=>x.userData.falFacetedHandguard);
 assert.ok(upper&&hand);
 assert.equal(countGeometry(upper).triangles,48,'receiver uses four six-corner rings');
 assert.equal(countGeometry(hand).triangles,48,'handguard uses four six-corner rings');
 assert.ok(FAL_HANDGUARD_STATIONS[1].top>=1.85);
 assert.ok(FAL_HANDGUARD_STATIONS[1].bottom<=-2.10);
 const h=FAL_HANDGUARD_STATIONS[1];
 assert.ok(h.top-h.bottom>=4,'handguard is visibly taller than P5');
 assert.ok(falHandguardSideHalfZAt(9,.5)<falHandguardSideHalfZAt(9,-1));
 clearWeaponSilhouette(root);m.dispose();
});
test('P6 port and slots are actually four-corner rectangles, not faux scallops',()=>{
 const {m,root}=make();
 const port=root.children.find(x=>x.userData.falEjectionPort);
 assert.ok(port&&port.userData.falRectangularPort);
 assert.equal(port.geometry.getAttribute('position').count,4);
 assert.equal(port.geometry.getIndex().count,6);
 const vents=root.children.filter(x=>x.userData.falVentCount===3);
 assert.equal(vents.length,2);
 for(const vent of vents){
  assert.equal(vent.geometry.getAttribute('position').count,12);
  assert.equal(vent.geometry.getIndex().count,18);
 }
 const pivots=root.children.filter(x=>x.userData.falPivotSide);
 assert.equal(pivots.length,2);
 assert.ok(pivots.every(x=>x.geometry.parameters.radialSegments===6));
 clearWeaponSilhouette(root);m.dispose();
});
test('P6 stock heel and open guard: large primary shapes with fewer points',()=>{
 const {m,root}=make();
 const stock=root.getObjectByName('family-stock-fal-fixed-polymer-0');
 const pad=root.getObjectByName('family-stock-fal-fixed-polymer-1');
 const guard=root.children.find(x=>x.userData.falTriggerGuard);
 assert.ok(stock&&pad&&guard);
 assert.equal(stock.geometry.parameters.shapes.getPoints(1).length>=8,true);
 const padBox=new THREE.Box3().setFromObject(pad);
 assert.ok(padBox.max.y-padBox.min.y<=4.33);
 assert.equal(guard.geometry.parameters.shapes.holes.length,1);
 clearWeaponSilhouette(root);m.dispose();
});
