import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {LOADOUT_SLOTS,itemsForSlot} from '../src/equipment-catalog.ts';
import {FAMILY_PRESETS,matchingFamilyPreset} from '../src/equipment-weapon-families.ts';
import {issueWeaponPreset} from '../src/breach-weapon-issue.ts';
import {initialRoster,equipRosterCatalogPreset} from '../src/breach-roster.ts';
import {catalogOutfitterSources,catalogOutfitterThumbnailTarget} from '../src/ui/outfitter-choice-sources.ts';
test('Quick Play primary choices are authored model identities, not temporary DOM or categories',()=>{
 const issue=issueWeaponPreset('hk-mp5a3'),kit=initialEquipmentLoadout(issue.weapon);
 const sources=catalogOutfitterSources(kit,issue.weaponConfiguration);
 assert.equal(sources.size,LOADOUT_SLOTS.length-1);
 for(const slot of LOADOUT_SLOTS){
  if(slot==='tactical'){assert.equal(sources.has(slot),false);continue;}
  const source=sources.get(slot);assert.ok(source);
  const options=[...source.options];
  if(slot==='primary'){
   assert.equal(source.value,'hk-mp5a3');
   assert.deepEqual(options.map(o=>o.value),FAMILY_PRESETS.map(p=>p.id));
   assert.ok(options.every(o=>o.dataset.catalogName));
  }else{
   assert.equal(source.value,kit.slots[slot]);
   assert.deepEqual(options.map(o=>o.value),itemsForSlot(slot).map(item=>item.id));
  }
  assert.ok(options.every(o=>!o.disabled));
 }
 assert.equal(typeof document,'undefined');
});
test('every named Quick Play reference equips directly and supplies its actual thumbnail recipe',()=>{
 const base=initialRoster(),original=base.members[0];
 for(const preset of FAMILY_PRESETS){
  const next=equipRosterCatalogPreset(base,original.id,preset.id);
  const member=next.members[0];
  assert.equal(matchingFamilyPreset(member.weaponConfiguration.build).id,preset.id);
  assert.equal(member.weapon,preset.weapon);
  assert.equal(member.loadout.slots.primary,'primary-'+preset.weapon);
  assert.deepEqual(next.members.slice(1),base.members.slice(1));
  const target=catalogOutfitterThumbnailTarget(original.loadout,original.weaponConfiguration,'primary',preset.id);
  if(matchingFamilyPreset(original.weaponConfiguration.build).id!==preset.id)
   assert.equal(matchingFamilyPreset(target.weaponConfiguration.build).id,preset.id);
 }
 assert.strictEqual(equipRosterCatalogPreset(base,original.id,'not-a-model'),base);
});
