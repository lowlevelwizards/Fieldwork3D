import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWardrobe,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
test('empty wardrobe defaults follow actual selected garment families',()=>{
 let k=initialEquipmentLoadout();
 k=setEquipmentChoice(k,'top','top-light');
 k=setEquipmentChoice(k,'legs','legs-light');
 k=setEquipmentChoice(k,'feet','feet-light');
 const w=resolvedWardrobe(initialWardrobe(),k);
 assert.equal(w.top,'light-shirt');
 assert.equal(w.trousers,'work-pants');
 assert.equal(w.footwear,'light-boots');
});
test('all texture channels are wired in Wardrobe Lab',()=>{
 const h=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const slot of ['top','trousers','armor','gear','pack','head'])
  assert.ok(h.includes('data-wardrobe-pattern="'+slot+'"'));
 assert.match(js,/setWardrobePattern/);
 assert.match(js,/wardrobeOptions=.*palette:/);
});
