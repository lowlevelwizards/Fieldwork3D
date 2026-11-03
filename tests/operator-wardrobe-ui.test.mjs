import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WARDROBE_SLOTS} from '../src/operator-wardrobe-data.ts';
import {APPEARANCE_GROUP_LABELS} from '../src/operator-appearance-grid.ts';
test('Operator Lab appearance now selects via real 3D item cards, not legacy dropdowns',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.ok(html.includes('id="appearanceItemBrowser"'));
 assert.ok(!html.includes('data-wardrobe-slot='));
 assert.ok(html.includes('id="rolledSleeves"'));
 for(const slot of WARDROBE_SLOTS)
  assert.ok(APPEARANCE_GROUP_LABELS[slot],slot);
 assert.match(js,/new OperatorAppearanceGrid\(/);
 assert.match(js,/wardrobe:wardrobeOptions/);
 assert.match(js,/wardrobeOptions=initialWardrobe\(\)/);
});