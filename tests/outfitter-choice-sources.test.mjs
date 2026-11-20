import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {LOADOUT_SLOTS,itemsForSlot} from '../src/equipment-catalog.ts';
import {catalogOutfitterSources} from '../src/ui/outfitter-choice-sources.ts';

test('typed Quick Play gallery choices come from catalog, not temporary DOM',()=>{
 const kit=initialEquipmentLoadout('smg');
 const sources=catalogOutfitterSources(kit);
 assert.equal(sources.size,LOADOUT_SLOTS.length-1);
 for(const slot of LOADOUT_SLOTS){
  if(slot==='tactical'){
   assert.equal(sources.has(slot),false);
   continue;
  }
  const source=sources.get(slot);
  assert.ok(source,'missing '+slot);
  assert.equal(source.value,kit.slots[slot]);
  const options=[...source.options];
  assert.deepEqual(options.map(option=>option.value),
   itemsForSlot(slot).map(item=>item.id));
  assert.ok(options.every(option=>option.disabled===false));
  assert.ok(options.some(option=>option.value===source.value));
 }
 assert.equal(typeof document,'undefined',
  'catalog source construction should not need a browser DOM');
});

test('catalog choices reflect each operator without changing original loadouts',()=>{
 const a=initialEquipmentLoadout('carbine');
 const b=initialEquipmentLoadout('shotgun');
 const x=catalogOutfitterSources(a),y=catalogOutfitterSources(b);
 assert.equal(x.get('primary')?.value,'primary-carbine');
 assert.equal(y.get('primary')?.value,'primary-shotgun');
 assert.equal(a.slots.primary,'primary-carbine');
 assert.equal(b.slots.primary,'primary-shotgun');
 assert.notEqual(x,y);
});
