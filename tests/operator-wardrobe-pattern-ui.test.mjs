import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWardrobe,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('unmodeled light clothing resolves to the remaining honest foundation cuts',()=>{
 let k=initialEquipmentLoadout();
 for(const [slot,id] of [['top','top-light'],['legs','legs-light'],
  ['feet','feet-light']])k=setEquipmentChoice(k,slot,id);
 const w=resolvedWardrobe(initialWardrobe(),k);
 assert.equal(w.top,'bdu-shirt');
 assert.equal(w.trousers,'bdu-trousers');
 assert.equal(w.footwear,'field-boots');
});
test('old procedural pattern controls are fully replaced by approved camouflage browsing',()=>{
 const h=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.ok(h.includes('id="appearanceItemBrowser"'));
 assert.ok(h.includes('id="wardrobeFabricCamo"'));
 assert.doesNotMatch(h,/data-wardrobe-pattern/);
 assert.doesNotMatch(js,/setWardrobePattern|patternSelects|WARDROBE_PATTERNS/);
});