import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {captureReplayManifest,applyReplayActorIdentity}
 from '../src/breach-replay-manifest.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {proposeArsenalPartChange} from '../src/arsenal/compatibility.ts';
test('replay manifest preserves exact saved component configuration and contact geometry',()=>{
 const factory=selectWeaponFamilyPreset(initialWeaponConfiguration('smg'),'hk-mp5a3');
 const base=arsenalRecipeFromLegacy(factory);assert.ok(base);
 const stock=proposeArsenalPartChange(base,'stock','hk-mp5-fixed-stock');
 assert.equal(stock.valid,true);
 const optic=proposeArsenalPartChange(stock.nextRecipe,'optic','optic-reflex');
 assert.equal(optic.valid,true);
 const config=arsenalRecipeToLegacy(optic.nextRecipe);assert.ok(config);
 const live=newSession(0,91914);
 const operative=live.operators.find(actor=>actor.side==='blue');
 assert.ok(operative);
 operative.weapon='smg';operative.weaponConfiguration=config;
 const manifest=captureReplayManifest(live);
 const actor=manifest.actors.find(a=>a.id===operative.id);
 assert.ok(actor);
 assert.deepEqual(actor.weaponConfiguration,config);
 assert.equal(actor.weaponConfiguration.build.parts.stock,'hk-mp5-fixed-stock');
 assert.equal(actor.weaponConfiguration.slots.opticMount,'optic-hk-claw');
 assert.equal(actor.weaponConfiguration.slots.optic,'optic-reflex');
 // Historical snapshot never follows subsequent changes in the live kit.
 operative.weaponConfiguration.slots.optic='optic-irons';
 assert.equal(actor.weaponConfiguration.slots.optic,'optic-reflex');
 const playback=newSession(0,91914);
 applyReplayActorIdentity(playback,manifest);
 const restored=playback.operators.find(a=>a.id===operative.id);
 assert.ok(restored);
 assert.deepEqual(restored.weaponConfiguration,config);
 assert.equal(restored.weapon,'smg');
 const expected=resolveWeaponAssembly(config);
 const actual=resolveWeaponAssembly(restored.weaponConfiguration);
 assert.equal(actual.stockX,expected.stockX);
 assert.equal(actual.muzzleX,expected.muzzleX);
 assert.equal(actual.mounted.optic.id,expected.mounted.optic.id);
 restored.weaponConfiguration.build.parts.stock='hk-mp5-retract-stock';
 assert.equal(manifest.actors.find(a=>a.id===operative.id).weaponConfiguration.build.parts.stock,
  'hk-mp5-fixed-stock','playback cannot mutate archived recipe');
});
