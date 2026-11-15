import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const bound=g=>new THREE.Box3().setFromObject(g);
const of=(g,k)=>g.children.filter(c=>c.userData[k]);

test('FNC P2: real polymer forearm mesh, broad mirrored grooves, open padded stock',()=>{
 const m=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(m);
 assert.equal(of(g,'fncFacetedHandguard').length,1);
 assert.equal(of(g,'fncCrossSectionFaces')[0].userData.fncCrossSectionFaces,24);
 assert.equal(of(g,'fncVentSide').length,2);
 assert.deepEqual(of(g,'fncVentSide').map(x=>x.userData.fncVentSide).sort(),[-1,1]);
 assert.ok(of(g,'fncVentSide').every(x=>x.userData.fncGasVentCount===3));
 assert.equal(of(g,'fncStockRail').filter(x=>x.userData.fncStockRail===true).length,2);
 assert.equal(of(g,'fncCheekSleeve').length,1);
 assert.equal(of(g,'fncHandguardNoseCollar').length,0);
 assert.equal(of(g,'fncStampedMagazineRib').length,2);
 assert.equal(of(g,'fncMagwellLip').length,1);
 const cheek=of(g,'fncCheekSleeve')[0];
 assert.ok(bound(cheek).max.y>-.45,'cheek is on top stock rail');
 assert.ok(bound(cheek).min.y>-1,'cheek does not fill stock void');
 clearWeaponSilhouette(g);m.dispose();
});
test('FNC P2: asymmetrical receiver port, side handle and left selector',()=>{
 const m=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(m);
 assert.equal(of(g,'fncRightPort').length,1);
 assert.equal(of(g,'fncPortLip').length,0);
 assert.equal(of(g,'fncRightChargingHandle').length,1);
 assert.equal(of(g,'fncLeftSelector').length,1);
 assert.ok(bound(of(g,'fncRightPort')[0]).min.z>0);
 assert.ok(bound(of(g,'fncLeftSelector')[0]).max.z<0);
 assert.ok(bound(of(g,'fncRightChargingHandle')[0]).max.z>
  bound(of(g,'fncFlatStampedUpper')[0]).max.z+.3);
 clearWeaponSilhouette(g);m.dispose();
});
test('FNC P2: palette is optional, geometry and bounds unchanged',()=>{
 const m=new THREE.MeshBasicMaterial({color:0x333333});
 const steel=new THREE.MeshBasicMaterial({color:0x777777});
 const guard=new THREE.MeshBasicMaterial({color:0x445544});
 const mono=buildFNCStage1Silhouette(m);
 const painted=buildFNCStage1Silhouette(m,{steel,handguard:guard});
 assert.equal(painted.children.length,mono.children.length);
 const a=bound(mono),b=bound(painted);
 for(const axis of ['x','y','z']){
  assert.ok(Math.abs(a.min[axis]-b.min[axis])<.005);
  assert.ok(Math.abs(a.max[axis]-b.max[axis])<.005);
 }
 assert.ok(Math.abs(a.min.x-FNC_P1.stockRearX)<.02);
 assert.ok(Math.abs(a.max.x-FNC_P1.muzzleX)<.02);
 assert.equal(of(painted,'fncFacetedHandguard')[0].material,guard);
 assert.equal(of(painted,'fncFlatStampedUpper')[0].material,steel);
 assert.ok(mono.children.every(c=>c instanceof THREE.Mesh&&c.material===m));
 clearWeaponSilhouette(mono);clearWeaponSilhouette(painted);
 m.dispose();steel.dispose();guard.dispose();
});
