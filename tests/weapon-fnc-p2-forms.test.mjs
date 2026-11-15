import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const bound=g=>new THREE.Box3().setFromObject(g);
const of=(g,k)=>g.children.filter(c=>c.userData[k]);

test('FNC P10: grooved forearm and clean open stock without cheek sleeve',()=>{
 const m=new THREE.MeshBasicMaterial();
 const g=buildFNCStage1Silhouette(m);
 assert.equal(of(g,'fncFacetedHandguard').length,1);
 assert.equal(of(g,'fncCrossSectionFaces')[0].userData.fncCrossSectionFaces,6);
 assert.equal(of(g,'fncP5GrooveSide').length,4);
 assert.deepEqual(of(g,'fncP5GrooveLevel').map(x=>x.userData.fncP5GrooveLevel).sort(),['lower','lower','upper','upper']);
 assert.ok(of(g,'fncP5GrooveLevel').every(x=>x.userData.fncP5GrooveCount===2));
 assert.equal(of(g,'fncStockRail').filter(x=>x.userData.fncStockRail===true).length,2);
 assert.equal(of(g,'fncCheekSleeve').length,0);
 assert.equal(of(g,'fncHandguardNoseCollar').length,0);
 assert.equal(of(g,'fncP11HandstopLip').length,1);
 assert.equal(of(g,'fncP11TopGasVentRow').length,1);
 assert.equal(of(g,'fncStampedMagazineRib').length,2);
 assert.equal(of(g,'fncMagwellLip').length,1);
 const top=of(g,'fncP10ContinuousBareUpperRail')[0];
 assert.ok(top&&bound(top).max.x-bound(top).min.x>7.5,
  'metal top beam reaches the butt without the former sleeve');
 assert.ok(bound(top).min.y>-.7,'bare rail preserves the stock void');
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
