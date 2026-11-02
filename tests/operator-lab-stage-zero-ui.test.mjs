import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
test('Stage 0 Lab controls are wired, have empty startup, and avoid duplicate kit selectors',()=>{
 for(const id of ['unequipAll','focusSelected','hideSelected','showAll','kitIsolation'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/<option value="none" selected>NO WEAPON/);
 for(const physical of ['head','armor','rig','belt','backpack','top','legs','hands','feet'])
  assert.ok(!html.includes('data-kit-slot="'+physical+'"'));
 assert.match(lab,/let labKit:EquipmentLoadout=bareLabEquipment\(\)/);
 assert.match(lab,/unequipLabAppearance\(\)/);
 assert.match(lab,/unarmedPreview:weapon\.value==='none'/);
 assert.match(lab,/selectWardrobeItem\(labKit,wardrobeOptions,slot,select\.value\)/);
});
test('new isolation covers new wardrobe layers, and framing supports hands and knees',()=>{
 for(const layer of ['wardrobeHead','wardrobeGear','wardrobeBody','accessories'])
  assert.ok(lab.includes('v.'+layer));
 assert.match(lab,/hide\\('knees'/);
 assert.match(lab,/hide\\('hands'/);
 assert.match(lab,/hide\\('pack'/);
 assert.match(lab,/frameWardrobeSelection/);
});
