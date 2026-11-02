import test from 'node:test';
import assert from 'node:assert/strict';
import {WARDROBE_RECIPES,applyWardrobeRecipe} from '../src/operator-wardrobe-recipes.ts';
import {resolvedWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
test('every curated role/organization recipe is equipment-compatible and non-duplicating',()=>{
 assert.equal(new Set(WARDROBE_RECIPES.map(x=>x.id)).size,WARDROBE_RECIPES.length);
 for(const recipe of WARDROBE_RECIPES){
  const {kit,wardrobe}=applyWardrobeRecipe(recipe);
  assert.deepEqual(wardrobeConflicts(wardrobe,kit),[],recipe.id);
  const choices=resolvedWardrobe(wardrobe,kit);
  assert.ok(choices.top);
  assert.ok(choices.headwear);
  assert.equal(kit.slots.primary,'primary-'+recipe.weapon);
 }
});
