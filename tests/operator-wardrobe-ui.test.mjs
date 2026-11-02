import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('lab offers neutral style slots with gameplay compatibility rules',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const slot of ['headwear','facewear','eyewear','headset','top',
  'trousers','footwear','armorStyle','rigStyle','beltStyle',
  'packStyle','gloves','knees','wrist'])
  assert.ok(html.includes('data-wardrobe-slot="'+slot+'"'));
 assert.ok(html.includes('id="rolledSleeves"'));
 assert.match(js,/resolvedWardrobe\(candidate,labKit\)/);
 assert.match(js,/wardrobe:wardrobeOptions/);
 assert.match(js,/wardrobeOptions=initialWardrobe\(\)/);
});
