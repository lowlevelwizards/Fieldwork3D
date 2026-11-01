import test from 'node:test';import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice,totalEquipmentMass}
 from '../src/equipment-loadouts.ts';
import {canUseEntryTool,equippedEntryMethods}
 from '../src/equipment-entry-tools.ts';
test('23.01 no equipped breaching tool means no specialized entry',()=>{
 const base=initialEquipmentLoadout('carbine');
 for(const method of ['pry','cut','wedge','breach'])
  assert.equal(canUseEntryTool(base,method),false);
});
test('23.01 specialized issued tools are mutually exclusive and contribute mass',()=>{
 const base=initialEquipmentLoadout('carbine');
 for(const [id,method] of [['utility-breach','breach'],
  ['utility-pry','pry'],['utility-cutter','cut'],['utility-wedge','wedge']]){
  const kit=setEquipmentChoice(base,'utility',id);
  assert.ok(canUseEntryTool(kit,method),id);
  assert.ok(totalEquipmentMass(kit)>totalEquipmentMass(setEquipmentChoice(base,'utility','utility-none')));
 }
 assert.deepEqual(equippedEntryMethods(setEquipmentChoice(base,'utility','utility-wedge')),
  ['wedge','unwedge']);
});
