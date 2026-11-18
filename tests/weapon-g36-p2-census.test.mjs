/** P2 actual factory comparison; all entries use the production Arsenal builder.
 * This produces a machine-readable peer census in CI without a second renderer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {auditA4} from '../scripts/audit-arsenal-a4.mjs';
import {buildG36OriginalBlockout}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const triangles=o=>(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;
test('G36 P2 production-wide geometry census: rifle peers and per-mesh attribution',()=>{
 const report=auditA4(),all=report.factoryPresets;
 const g36=all.find(p=>p.id==='g36-service');
 assert.ok(g36,'G36 must be in actual factory catalog');
 const peerIds=['ar-m16a2','ar-m4a1','ak-akm','hk-g3a3',
  'fnc-service','fal-5000'];
 const peers=peerIds.map(id=>all.find(p=>p.id===id));
 assert.ok(peers.every(Boolean),'real production rifle peers must resolve');
 const material=new THREE.MeshBasicMaterial(),root=buildG36OriginalBlockout(material);
 const rows=root.children.filter(o=>o instanceof THREE.Mesh).map(o=>({
  name:o.name,triangles:triangles(o),geometry:o.geometry.type,
  features:Object.keys(o.userData).filter(k=>k.startsWith('g36'))
 }));
 const grouped={};
 for(const r of rows){
  const slot=r.name.split('-')[1];
  grouped[slot]??={meshes:0,triangles:0};
  grouped[slot].meshes++;grouped[slot].triangles+=r.triangles;
 }
 const ranking=[...all].sort((a,b)=>b.triangles-a.triangles).map(p=>({
  id:p.id,triangles:p.triangles,meshes:p.meshes
 }));
 console.log('G36_P2_FACTORY_CENSUS '+JSON.stringify({
  g36:{triangles:g36.triangles,meshes:g36.meshes},
  peers:peers.map(p=>({id:p.id,triangles:p.triangles,meshes:p.meshes})),
  all:ranking,parts:grouped
 }));
 assert.equal(g36.meshes,rows.length,
  'production master must not create extra hidden accessory meshes');
 assert.ok(g36.triangles<=650,'minimal H3 sculpt must stay inside the 650-triangle peer gate');
 assert.ok(g36.meshes===22,'H3 drops both H2 cavity and mounting lug');
 assert.ok(all.length>=20,'audit must cover the full Arsenal, not just a handpicked list');
 assert.equal(grouped.handguard.meshes,1,'one capped hex shell only');
 assert.ok(grouped.handguard.triangles,20,'one twelve-side-triangle shell and two four-triangle end caps');
 assert.equal(grouped.barrel.meshes,2);
 assert.equal(grouped.barrel.triangles,24,
  'barrel and muzzle are precisely two 12-triangle boxes');
 assert.ok(grouped.receiver.triangles>grouped.barrel.triangles,
  'art budget should emphasize receiver/optics rather than barrel');
 clearWeaponSilhouette(root);material.dispose();
});
