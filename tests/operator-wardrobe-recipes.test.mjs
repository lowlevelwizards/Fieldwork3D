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

test('BT9: representative roles select the actual belt family; historical webbing does not add a second belt',()=>{
 const expected={'plainclothes-leather':'belt-light','service-utility':'belt-standard','modern-entry':'belt-battle','field-medic':'belt-padded','bdu-field':'belt-none','desert-field':'belt-none','bush-webbing':'belt-none'};
 for(const [id,belt] of Object.entries(expected)){
  const recipe=WARDROBE_RECIPES.find(r=>r.id===id);assert.ok(recipe,id);
  const {kit,wardrobe}=applyWardrobeRecipe(recipe);
  assert.equal(kit.slots.belt,belt,id);assert.deepEqual(wardrobeConflicts(wardrobe,kit),[],id);
 }
});
