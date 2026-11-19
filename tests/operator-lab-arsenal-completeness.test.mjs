import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {ARSENAL_PLATFORMS,ARSENAL_REFERENCES,arsenalCatalogIssues}
 from '../src/arsenal/catalog.ts';
import {POSE_WEAPON_GROUPS,poseWeaponType,posePreset}
 from '../src/operator-lab-pose-browser.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

test('all actual Arsenal platforms and every factory build appear in Operator Lab',()=>{
 assert.deepEqual(arsenalCatalogIssues(),[]);
 assert.deepEqual(POSE_WEAPON_GROUPS.map(group=>group.id),
   ARSENAL_PLATFORMS.map(platform=>platform.id));
 assert.deepEqual(POSE_WEAPON_GROUPS.map(group=>group.name),
   ARSENAL_PLATFORMS.map(platform=>platform.name));
 const all=POSE_WEAPON_GROUPS.flatMap(group=>group.presets);
 assert.equal(all.length,ARSENAL_REFERENCES.length);
 assert.deepEqual(new Set(all.map(p=>p.id)),
   new Set(FAMILY_PRESETS.map(p=>p.id)));
 assert.equal(new Set(all.map(p=>p.id)).size,all.length);
 for(const platform of POSE_WEAPON_GROUPS){
  assert.ok(platform.presets.length,platform.name+' empty');
  assert.deepEqual(platform.presets.map(p=>p.id),
   ARSENAL_REFERENCES.filter(ref=>ref.platformId===platform.id)
    .map(ref=>ref.id));
  for(const preset of platform.presets){
   assert.equal(posePreset(preset.id),preset,preset.id);
   assert.equal(poseWeaponType(preset.id),preset.weapon,preset.id);
   const config=selectWeaponFamilyPreset(
    initialWeaponConfiguration(preset.weapon),preset.id);
   assert.equal(config.build?.family,preset.family,
    preset.id+' should use the actual model, not a legacy generic stand-in');
   assert.deepEqual(config.build?.parts,preset.parts);
  }
 }
 // Previously absent from the UI despite having valid physical silhouettes.
 for(const id of ['fnc-service','g36-service','g36-k-dual',
  'g36-c-classic','g36-ka4'])
  assert.ok(all.some(p=>p.id===id),id+' not listed');
});

test('Operator Lab uses platform-generated options while preserving shotgun, none and custom saved builds',()=>{
 const source=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(source,/for\(const platform of POSE_WEAPON_GROUPS\)/);
 assert.match(source,/group\.append\(new Option\(preset\.name,preset\.id\)\)/);
 assert.match(source,/poseWeaponSelect\.add\(new Option\('No Weapon','none'\)\)/);
 assert.match(source,/poseWeaponSelect\.add\(new Option\('Shotgun','shotgun'\)\)/);
 assert.doesNotMatch(source,/\['ar','AR \/ M4 \/ M16'\]/);
 assert.match(source,/const savedWeaponConfig=savedWeaponConfig|const savedWeaponConfig=/);
 assert.match(source,/const exactWeaponConfig=savedWeaponConfig\?\?poseWeaponConfig/);
 assert.match(source,/poseWeaponSelect\.addEventListener\('change'/);
 assert.equal(poseWeaponType('none'),'none');
 assert.equal(poseWeaponType('shotgun'),'shotgun');
});
