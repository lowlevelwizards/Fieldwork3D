import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('recipe browser is sandbox-only and applies both correct kit and look',()=>{
 const h=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.ok(h.includes('id="wardrobeRecipe"'));
 assert.ok(h.includes('id="wardrobeApply"'));
 assert.match(js,/applyWardrobeRecipe\(recipe\)/);
 assert.match(js,/labKit=result\.kit/);
 assert.match(js,/wardrobeOptions=result\.wardrobe/);
});
