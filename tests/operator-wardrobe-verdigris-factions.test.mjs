import test from 'node:test';
import assert from 'node:assert/strict';
import {wardrobeRecipe,applyWardrobeRecipe} from '../src/operator-wardrobe-recipes.ts';
import {wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
test('the three Verdigris factions have distinct, valid visual equipment recipes',()=>{
 const factions=['northline','commune','freelancers'];
 const looks=factions.map(id=>wardrobeRecipe(id));
 assert.ok(looks.every(Boolean));
 assert.equal(new Set(looks.map(x=>x.styles.top)).size,3);
 for(const recipe of looks){
  const {kit,wardrobe}=applyWardrobeRecipe(recipe);
  assert.deepEqual(wardrobeConflicts(wardrobe,kit),[],recipe.id);
 }
});
