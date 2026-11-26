import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,readRoster} from '../src/breach-roster.ts';
import {resolveCatalogConfiguration,issueWeaponPreset} from '../src/breach-weapon-issue.ts';
import {defaultCatalogReference,validFamilyBuild,matchingFamilyPreset} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,setConfiguredFamilyPart} from '../src/equipment-weapon-assemblies.ts';
import {serializeQuickPlayKitPreferences,applyQuickPlayKitPreferences} from '../src/breach-quickplay-kit-preferences.ts';
import {captureDeploymentInventory} from '../src/equipment-deployment-snapshot.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
test('old input categories resolve deterministically to existing named references',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const c=resolveCatalogConfiguration(initialWeaponConfiguration(weapon),weapon);
  assert.equal(matchingFamilyPreset(c.build)?.id,defaultCatalogReference(weapon).id);
  assert.ok(validFamilyBuild(c.build,weapon));
  assert.strictEqual(resolveCatalogConfiguration(c,weapon),c,'idempotent canonical materialization');
 }
 const c=issueWeaponPreset('ak-akm').weaponConfiguration;
 assert.strictEqual(resolveCatalogConfiguration(c,c.weapon,'ar-m16a2'),c);
 const custom=setConfiguredFamilyPart(c,'stock','ak-stock-akm-wood');
 assert.deepEqual(resolveCatalogConfiguration(custom,custom.weapon),custom);
});
test('Quick Play V1 generic selection migrates to authored V2 config with no duplicate top-level class',()=>{
 const roster=initialRoster();
 const input={version:1,members:[{id:'rook',weapon:'shotgun',loadout:initialEquipmentLoadout('shotgun'),
  weaponConfiguration:initialWeaponConfiguration('shotgun'),magazineLocations:[]}]};
 const migrated=applyQuickPlayKitPreferences(roster,JSON.stringify(input));
 assert.equal(migrated.members[0].weaponConfiguration.build.family,'r870');
 const raw=serializeQuickPlayKitPreferences(migrated),v2=JSON.parse(raw);
 assert.equal(v2.version,2);
 assert.ok(v2.members.every(m=>!Object.hasOwn(m,'weapon')&&m.weaponConfiguration.build));
 const again=applyQuickPlayKitPreferences(roster,raw);
 assert.deepEqual(again.members[0].weaponConfiguration,migrated.members[0].weaponConfiguration);
 assert.deepEqual(again.members[0].loadout,migrated.members[0].loadout);
 const invalid=structuredClone(v2);delete invalid.members[0].weaponConfiguration.build;
 assert.deepEqual(applyQuickPlayKitPreferences(roster,JSON.stringify(invalid)).members[0],roster.members[0]);
});
test('Roster and deployment migrate missing shotgun configuration without changing saved inventory',()=>{
 const base=initialRoster();const m=base.members[0];
 const old={...m,weapon:'shotgun',weaponConfiguration:initialWeaponConfiguration('shotgun'),
  loadout:initialEquipmentLoadout('shotgun'),magazine:3,reserve:12,magazines:[],loadedMagazineId:m.id+'/shotgun/loaded'};
 const before=structuredClone(old);
 const snapshot=captureDeploymentInventory(old);
 assert.equal(snapshot.weaponConfiguration.build.family,'r870');
 assert.equal(snapshot.magazine,3);assert.equal(snapshot.reserve,12);
 assert.deepEqual(snapshot.spareMagazines,[]);assert.deepEqual(old,before);
 const restored=readRoster(JSON.stringify({...base,members:[old,...base.members.slice(1)]}));
 assert.equal(restored.members[0].weaponConfiguration.build.family,'r870');
 assert.equal(restored.members[0].magazine,3);assert.equal(restored.members[0].reserve,12);
});
