import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const bound=g=>new THREE.Box3().setFromObject(g);
const of=(g,k)=>g.children.filter(c=>c.userData[k]);

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
