import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {collectArsenalA1Manifest} from '../scripts/audit-arsenal-a1.mjs';

test('A1 manifests every actual factory preset and preserves all identities',()=>{
 const manifest=collectArsenalA1Manifest();
 assert.equal(manifest.schema,'fieldwork-arsenal-a1');
 assert.equal(manifest.version,1);
 assert.equal(manifest.totals.presets,FAMILY_PRESETS.length);
 assert.equal(manifest.presets.length,ARSENAL_REFERENCES.length);
 assert.deepEqual(new Set(manifest.presets.map(p=>p.id)),
  new Set(FAMILY_PRESETS.map(p=>p.id)));
 assert.equal(Object.values(manifest.totals.byPlatform).reduce((a,b)=>a+b,0),
  manifest.totals.presets);
});

test('A1 geometry and finish census has finite real mesh and surface data',()=>{
 const manifest=collectArsenalA1Manifest();
 for(const preset of manifest.presets){
  assert.ok(preset.meshes>=12,preset.id+' meshes');
  assert.ok(preset.triangles>=100,preset.id+' triangles');
  assert.ok(preset.vertices>0,preset.id+' vertices');
  assert.ok(preset.uniqueGeometries>0,preset.id+' geometries');
  assert.ok(preset.materials.length>0,preset.id+' materials');
  assert.ok(preset.materials.some(m=>m.role==='steel'),preset.id+' must have steel');
  assert.equal(preset.bySlot.receiver?.meshes>0,true,preset.id+' receiver');
  assert.equal(preset.bySlot.magazine?.meshes>0,true,preset.id+' magazine');
  for(const value of [...preset.bounds.min,...preset.bounds.max])
   assert.ok(Number.isFinite(value),preset.id+' bounds');
  for(const entry of preset.materials){
   assert.match(entry.type,/Material$/);
   assert.ok(entry.hex===null||/^#[0-9a-f]{6}$/i.test(entry.hex),preset.id+' finish hex');
   assert.ok(entry.triangles>0,preset.id+' nonempty material');
  }
 }
 const fnc=manifest.presets.find(p=>p.id==='fnc-service');
 assert.ok(fnc);
 assert.equal(fnc.meshes,23,'P30 FNC reference mesh budget');
 assert.equal(fnc.triangles,536,'P30 FNC reference triangle budget');
});

test('A1 browser contact sheet uses actual production builders and four fixed panels',()=>{
 const page=readFileSync(new URL('../src/arsenal/a1-capture.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../arsenal-a1-capture.html',import.meta.url),'utf8');
 for(const name of ['ARSENAL_REFERENCES','buildWeaponSilhouette',
  'buildWeaponAccessories','addArsenalInspectionLighting','weaponVisualLayout'])
  assert.ok(page.includes(name),'actual production source '+name);
 for(const name of ['Side','Three-quarter','Top','Grayscale side'])
  assert.ok(page.includes(name),'visual panel '+name);
 assert.match(html,/\.view\.is-gray img\{filter:grayscale\(1\)\}/);
 assert.doesNotMatch(page,/localStorage|persistArsenal|commitArsenal/);
});
