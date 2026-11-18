import test from 'node:test';
import assert from 'node:assert/strict';
import {arsenalReferencesForPlatform,arsenalCatalogIssues}
 from '../src/arsenal/catalog.ts';
import {FAMILY_PRESETS,validFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {ARSENAL_MAGAZINE_CAPACITIES,arsenalMagazineCatalogIssues}
 from '../src/arsenal/magazine-identities.ts';
import {liveMagazineCapacity,freshMagazineIssue}
 from '../src/arsenal/live-magazine-capacity.ts';

test('original G36 is an independently selectable Arsenal factory rifle',()=>{
 const refs=arsenalReferencesForPlatform('g36');
 assert.deepEqual(refs.map(p=>p.id),[
  'g36-service','g36-k-dual','g36-c-classic','g36-ka4'
 ]);
 assert.deepEqual(arsenalCatalogIssues(),[]);
 const preset=FAMILY_PRESETS.find(p=>p.id==='g36-service');
 assert.ok(preset);
 assert.ok(validFamilyBuild({family:preset.family,parts:preset.parts},'rifle'));
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),preset.id);
 assert.equal(config.build?.family,'g36');
 assert.equal(config.build?.parts.magazine,'g36-mag30');
 assert.equal(config.slots.optic,'optic-g36-integrated');
});

test('G36 service polymer magazine has full authoritative 30-round capacity',()=>{
 assert.deepEqual(arsenalMagazineCatalogIssues(),[]);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
 assert.equal(ARSENAL_MAGAZINE_CAPACITIES['g36-mag30'],30);
 assert.equal(liveMagazineCapacity('rifle',config),30);
 const issue=freshMagazineIssue('g36-review','rifle',config);
 assert.equal(issue.magazine,30);
 assert.equal(issue.reserve,90);
 assert.deepEqual(issue.magazines.map(m=>m.rounds),[30,30,30]);
});
