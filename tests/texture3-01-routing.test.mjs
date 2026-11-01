import test from 'node:test';
import assert from 'node:assert/strict';
import {fixturePixelSurface,fixtureComponentSurface,FIXTURE_MATERIAL_OVERRIDES}
 from '../src/worldgen/pixel-surface-selection.ts';
import {CHARACTER_FIXTURE_IDS} from '../src/worldgen/asset-character-visuals.ts';
import {DETAILED_FIXTURE_IDS} from '../src/worldgen/detailed-fixture-visuals.ts';
test('both dumpster render paths select manufactured metal rather than wood or foliage',()=>{
 assert.equal(fixturePixelSurface('dumpster'),'metal');
 assert.equal(fixtureComponentSurface('dumpster','body'),'metal');
 assert.equal(fixtureComponentSurface('dumpster','lid'),'plastic');
 assert.equal(fixtureComponentSurface('dumpster','wheel'),'rubber');
 assert.ok(CHARACTER_FIXTURE_IDS.has('dumpster')&&DETAILED_FIXTURE_IDS.has('dumpster'));
});
test('component material roles are safe and fallback is not wood',()=>{
 assert.equal(fixturePixelSurface('shipping-container'),'metal');
 assert.equal(fixtureComponentSurface('shipping-container','frame'),'metal');
 assert.equal(fixturePixelSurface('unknown-procedural-asset'),'metal');
 for(const [id,roles] of Object.entries(FIXTURE_MATERIAL_OVERRIDES)){
  assert.ok(roles.body,id);assert.notEqual(roles.body,undefined);
 }
});
