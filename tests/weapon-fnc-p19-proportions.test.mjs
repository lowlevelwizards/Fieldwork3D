/** FNC P19: small silhouette corrections with measurable geometry discipline. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {FNC_P1} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';

const near=(a,b,t=.03)=>Math.abs(a-b)<=t;
const bbox=x=>new THREE.Box3().setFromObject(x);
const height=x=>bbox(x).max.y-bbox(x).min.y;
const select=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
const one=(g,flag)=>g.children.find(x=>x.userData[flag]);

test('P19: thinner barrel and longer, still six-sided, connected muzzle',()=>{
 const mat=new THREE.MeshBasicMaterial(),cfg=select();
 const factory=buildWeaponSilhouette('rifle',mat,mat,cfg);
 const barrel=one(factory,'fncP19RefinedBarrel'),
  muzzle=one(factory,'fncP19LongerFlashHider'),
  ports=one(factory,'fncP17ProjectedMuzzleSlots');
 assert.ok(barrel&&muzzle&&ports);
 assert.ok(near(height(barrel),1.24));
 assert.ok(near(bbox(muzzle).max.x,FNC_P1.muzzleX));
 assert.ok(near(bbox(muzzle).min.x,18.04));
 assert.ok(near(bbox(muzzle).max.x-bbox(muzzle).min.x,1.46));
 assert.ok(bbox(barrel).intersectsBox(bbox(muzzle)));
 assert.ok(ports.geometry.getAttribute('position').count===24);
 assert.ok(bbox(ports).min.x>bbox(muzzle).min.x&&
  bbox(ports).max.x<bbox(muzzle).max.x);
 assert.equal(resolveWeaponAssembly(cfg).muzzleX,19.5);
 const suppressed={...cfg,slots:{...cfg.slots,muzzle:'muzzle-suppressor'}};
 const bare=buildWeaponSilhouette('rifle',mat,mat,suppressed);
 assert.ok(!one(bare,'fncMuzzle'));
 assert.ok(near(bbox(bare).max.x,FNC_P1.muzzleX));
 clearWeaponSilhouette(factory);clearWeaponSilhouette(bare);mat.dispose();
});
test('P19: report actual emitted triangles and draw-call proxies alongside peers',()=>{
 const all=buildAuditReport();
 const names=['FNC','FAL','G3A3','M16A2','M4A1'];
 assert.deepEqual(all.slice(0,5).map(x=>x.name),names);
 for(const entry of all){
  assert.ok(entry.triangles>0&&entry.meshes>0);
  assert.equal(entry.meshes,entry.geometries);
 }
 const fnc=all.find(x=>x.name==='FNC');
 assert.ok(fnc.triangles<=800,'stop front-end topology from ballooning');
 assert.ok(fnc.meshes<=34,'do not add gratuitous FNC pieces or draw calls');
 assert.ok(fnc.byPart.handguard.triangles<=160,
  'vent, groove and six-face handguard should stay deliberately simple');
 console.log('FNC P19 CROSS-FAMILY REAL TRIANGLE AUDIT',JSON.stringify(all));
});