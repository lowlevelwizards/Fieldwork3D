import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS,validFamilyBuild,
 initialWeaponFamilyBuild,compatibleFamilyPart}
 from '../src/equipment-weapon-families.ts';
import {ARSENAL_PLATFORMS,arsenalCatalogIssues,arsenalReferencesForPlatform}
 from '../src/arsenal/catalog.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly,
 readWeaponConfiguration,setConfiguredFamilyPart}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {weaponPresentationSockets} from '../src/breach-weapon-presentation.ts';
import {lowReadyArchetype} from '../src/breach-low-ready-archetypes.ts';
import {lowReadyFamilyFit} from '../src/breach-low-ready-family-fit.ts';
import {carriedMagazineProfile,carriedMagazineGeometry}
 from '../src/operator-carried-magazines.ts';
import {arsenalMagazineIdentity,compareArsenalMagazineWithSimulation}
 from '../src/arsenal/magazine-identities.ts';
import {reloadMechanismFor} from '../src/breach-reload-performance.ts';
import {FAL_BARREL_ART} from '../src/weapons/geometry/fal-barrel-profiles.ts';

const rifle=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
test('FAL S2/P13: four compatible factory references with shared receiver',()=>{
 const matches=FAMILY_PRESETS.filter(p=>p.family==='fal');
 assert.deepEqual(matches.map(x=>x.id),
  ['fal-5000','fal-5000-classic','fal-5061','fal-5063']);
 assert.equal(ARSENAL_PLATFORMS.find(p=>p.id==='fal')?.name,'FN FAL');
 assert.deepEqual(arsenalReferencesForPlatform('fal').map(p=>p.id),
  matches.map(x=>x.id));
 assert.equal(Object.values(FAMILY_PARTS).filter(p=>p.family==='fal').length,11);
 assert.deepEqual(arsenalCatalogIssues(),[]);
 const build=initialWeaponFamilyBuild('fal-5000');
 assert.ok(build);
 assert.ok(validFamilyBuild(build,'rifle'));
 assert.equal(compatibleFamilyPart('fal-50-receiver','magazine','hk-g3-mag20','rifle'),false);
 assert.equal(compatibleFamilyPart('hk-g3-drum','magazine','fal-mag20','rifle'),false);
});
test('FAL S2: immutable config, V2 recipe, and 20-round nominal label survive serialization',()=>{
 const c=rifle();
 assert.equal(c.build?.family,'fal');
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(c)),'rifle'),c);
 assert.strictEqual(setConfiguredFamilyPart(c,'magazine','hk-g3-mag20'),c);
 const recipe=arsenalRecipeFromLegacy(c);assert.ok(recipe);
 assert.equal(recipe.platformId,'fal');
 const decoded=readArsenalRecipe(JSON.parse(JSON.stringify(recipe)));
 assert.deepEqual(decoded,recipe);
 assert.deepEqual(arsenalRecipeToLegacy(decoded)?.build,c.build);
 const mag=arsenalMagazineIdentity('fal-mag20');
 assert.equal(mag?.nominalRounds,20);
 // The preexisting class simulation still has 10 rounds. Don't misreport.
 const comparison=compareArsenalMagazineWithSimulation(recipe);
 assert.equal(comparison?.simulatedCapacity,10);
 assert.equal(comparison?.matchesSimulation,false);
});
test('FAL S2: FAL-specific geometry, front sight, carry handle, vents and muzzle agree',()=>{
 const c=rifle();
 const m=new THREE.MeshBasicMaterial();
 const g=buildWeaponSilhouette('rifle',m,m,c);
 const a=resolveWeaponAssembly(c);
 const bounds=new THREE.Box3().setFromObject(g);
 assert.ok(Math.abs(bounds.min.x+15.0)<.02);
 assert.ok(Math.abs(bounds.max.x-a.muzzleX)<.02);
 assert.equal(a.muzzleX,FAL_BARREL_ART['fal-21-service'].muzzleX);
 assert.equal(a.muzzleY,0);
 assert.equal(g.children.length,26,'FAL P4: crown, guard and three signature landmarks');
 assert.equal(g.children.filter(x=>x.name.startsWith('family-handguard-fal-vented')).length,3);
 assert.ok(g.children.every(x=>x.name.startsWith('family-')));
 assert.equal(g.children.filter(x=>x.name.startsWith('family-magazine-')).length,3);
 assert.ok(g.children.some(x=>x.name==='family-receiver-fal-50-receiver-4'&&x.userData.falCarrySupport),
  'factory carry support is attached to the receiver');
 assert.ok(g.children.some(x=>x.name==='family-receiver-fal-50-receiver-5'&&x.userData.falCarryGrip),
  'FAL factory grip extends rearward from its support');
 clearWeaponSilhouette(g);assert.equal(g.children.length,0);m.dispose();
});
test('FAL S2: stock, gripping, magazine sockets, carried magazine and safe poses',()=>{
 const c=rifle(),a=resolveWeaponAssembly(c),contacts=riflePoseContacts('rifle',c);
 assert.ok(contacts);assert.equal(contacts.family,'fal');
 assert.ok(contacts.support.near.x>3.8&&contacts.support.far.x<14.1);
 assert.equal(contacts.stock.x,a.stockX);
 const sockets=weaponPresentationSockets('rifle',c);
 assert.equal(sockets.magazine.x,1.00);
 assert.equal(sockets.magazine.y,-2.98);
 assert.equal(sockets.muzzle.x,a.muzzleX);
 assert.ok(lowReadyFamilyFit(c),"reuse G3 long-rifle posture, not its silhouette");
 assert.ok(lowReadyArchetype(c),'FAL explicitly opts into long-rifle archetype');
 assert.equal(reloadMechanismFor('rifle',c),'fal-side-charge',
   'FAL must manipulate its own side handle, not an HK slap');
 const carried=carriedMagazineProfile('fal-mag20');
 assert.equal(carried?.family,'fal');assert.ok(carried?.length>4.9);
 const mesh=carriedMagazineGeometry('fal-mag20');
 assert.ok(mesh);assert.ok(mesh.getAttribute('position').count>0);mesh.dispose();
});
