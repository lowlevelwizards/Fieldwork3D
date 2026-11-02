import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('cosmetic attachment editor stays separate from real carrying controls',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const s of ['beltLeft','beltRight','chest','pack'])
  assert.ok(html.includes('data-wardrobe-accessory="'+s+'"'));
 assert.match(lab,/WARDROBE_ACCESSORY_OPTIONS\[slot\]/);
 assert.match(lab,/wardrobeOptions\.accessories/);
 assert.match(html,/cosmetic-only/);
});
