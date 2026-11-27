import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,validFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {arsenalCatalogIssues,arsenalReferencesForPlatform}
 from '../src/arsenal/catalog.ts';
import {arsenalFactoryChoice} from '../src/arsenal/factory-recipes.ts';
import {arsenalRecipeToLegacy,arsenalRecipeIssues}
 from '../src/arsenal/recipes.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {weaponPresentationSockets}
 from '../src/breach-weapon-presentation.ts';
import {riflePoseContacts}
 from '../src/breach-weapon-contact-zones.ts';
import {carriedMagazineGeometry,carriedMagazineProfile}
 from '../src/operator-carried-magazines.ts';
import {liveMagazineCapacity}
 from '../src/arsenal/live-magazine-capacity.ts';
import {arsenalMagazineCatalogIssues}
 from '../src/arsenal/magazine-identities.ts';

const select=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
test('FNC is a distinct searchable factory platform with valid 5.56 parts',()=>{
 assert.deepEqual(arsenalCatalogIssues(),[]);
 assert.deepEqual(arsenalMagazineCatalogIssues(),[]);
 const refs=arsenalReferencesForPlatform('fnc');
 assert.equal(refs.length,1);
 assert.equal(refs[0].id,'fnc-service');
 assert.equal(refs[0].name,'FNC');
 const preset=FAMILY_PRESETS.find(p=>p.id==='fnc-service');
 assert.ok(preset);
 assert.ok(validFamilyBuild({family:preset.family,parts:preset.parts},'rifle'));
 assert.equal(FAMILY_PARTS['fnc-177-service'].nominalInches,17.7);
 assert.equal(FAMILY_PARTS['fnc-mag30'].feed,'stanag');
 assert.equal(FAMILY_PARTS['fnc-service-receiver'].feed,'stanag');
 const factory=arsenalFactoryChoice(refs[0]);
 assert.ok(factory);
 assert.deepEqual(arsenalRecipeIssues(factory.recipe),[]);
 assert.equal(arsenalRecipeToLegacy(factory.recipe)?.build?.parts.receiver,'fnc-service-receiver');
});
test('FNC renders the approved P2 geometry in Arsenal and operator rigs',()=>{
 const config=select(),a=resolveWeaponAssembly(config);
 assert.equal(config.build?.family,'fnc');
 assert.equal(a.muzzleX,19.5);
 assert.equal(a.stockX,-14.85);
 assert.equal(liveMagazineCapacity('rifle',config),30);
 const p=weaponPresentationSockets('rifle',config);
 assert.equal(p.magazinePart,'ar-mag30');
 assert.ok(Math.abs(p.magazine.x-1.05)<.05);
 assert.ok(Math.abs(p.reloadControl.x-.42)<.01);
 const contacts=riflePoseContacts('rifle',config);
 assert.equal(contacts?.family,'fnc');
 assert.ok(contacts&&contacts.support.near.x>=3.45&&contacts.support.far.x<=13.55);
 const m=new THREE.MeshBasicMaterial(),gun=buildWeaponSilhouette('rifle',m,m,config);
 const bounds=new THREE.Box3().setFromObject(gun);
 assert.ok(Math.abs(bounds.min.x+14.85)<.02);
 assert.ok(Math.abs(bounds.max.x-19.5)<.02);
 assert.ok(gun.children.some(x=>x.userData.fncFacetedHandguard));
 assert.ok(gun.children.some(x=>x.userData.fncPixelOperatingSlot));
 assert.ok(gun.children.some(x=>x.userData.fncP10ContinuousBareUpperRail));
 assert.ok(gun.children.some(x=>x.userData.fncP10DarkThickButtpad));
 assert.ok(!gun.children.some(x=>x.userData.fncCheekSleeve));
 assert.ok(gun.children.every(x=>!x.name.includes('fnc-p2-')),
  'factory geometry carries real part IDs');
 clearWeaponSilhouette(gun);
 const noMuzzle={...config,slots:{...config.slots,muzzle:'muzzle-suppressor'}};
 const body=buildWeaponSilhouette('rifle',m,m,noMuzzle);
 assert.ok(!body.children.some(x=>x.userData.fncMuzzle),
  'factory muzzle should not overlap mounted suppressor');
 assert.ok(Math.abs(new THREE.Box3().setFromObject(body).max.x-19.5)<.02);
 clearWeaponSilhouette(body);m.dispose();
});
test('FNC carried STANAG artwork and rifle class compatibility',()=>{
 assert.equal(carriedMagazineProfile('fnc-mag30')?.length,5.30);
 const geo=carriedMagazineGeometry('fnc-mag30');
 assert.ok(geo&&geo.getAttribute('position').count>0);
 geo.dispose();
 assert.equal(selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'fnc-service').build,undefined);
});
