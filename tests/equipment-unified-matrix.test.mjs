import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveUnifiedCarry,auditInitialUnifiedManifest} from '../src/equipment-unified-placement.ts';
import {clothingStorage,packStorage,registeredRigStorage,registeredAuxiliaryStorage,modularArmorStorage} from '../src/equipment-fixed-carrier-slots.ts';
import {authoredRigStorageCells} from '../src/operator-rig-pouch-layout.ts';
const item=(id,kind,width,height,depth,extra={})=>({id,kind,dimensions:{width,height,depth},...extra});
test('BT4 matrix: fixed slots, actual rig recipes, pack types and both holster sides never duplicate an item or a claim',()=>{
 let cases=0,valid=0;
 for(const belt of ['no-belt','plain-belt','duty-belt','battle-belt','padded-belt'])
 for(const rig of ['no-rig','light-rig','field-webbing','alice-lc2','sadf-webbing'])
 for(const pack of ['no-pack','day-pack','rucksack'])
 for(const holsterSide of ['left','right']){
  const authored=authoredRigStorageCells(rig),historicalWaist=['field-webbing','alice-lc2','sadf-webbing'].includes(rig);
  const storage=[...registeredRigStorage(authored.magazines),...registeredAuxiliaryStorage(authored.auxiliary),
   ...modularArmorStorage('plate-standard',rig,6,10.5,5,-5),...packStorage(pack),...clothingStorage('bdu-trousers','legs-field')];
  const items=[item('m0','primary-mag',2.5,4,1),item('m1','primary-mag',2.5,4,1),
   item('p0','secondary-mag',1.3,3,1),item('p1','secondary-mag',1.3,3,1),
   item('flash0','flash',2.5,5.8,2.5),item('flash1','flash',2.5,5.8,2.5),
   item('medical','medical',4,3,2),item('radio','radio',2,4,1.5),
   item('dump','dump',7,6,4,{optional:true})];
  if(belt!=='no-belt'&&!historicalWaist)items.push(item('sidearm','sidearm',2,5,1));
  const input={belt,holsterSide,historicalWaist,storage,items};
  const a=resolveUnifiedCarry(input,300),b=resolveUnifiedCarry({...input,items:[...items].reverse(),storage:[...storage].reverse()},300);
  assert.deepEqual(a,b,[belt,rig,pack,holsterSide].join('/'));
  assert.deepEqual(auditInitialUnifiedManifest(input,a),[],[belt,rig,pack,holsterSide].join('/'));
  cases++;if(a.valid)valid++;
 }
 assert.equal(cases,150);assert.ok(valid>0);
});
test('BT4 independent audit rejects corrupted reservations even if a manifest says valid',()=>{
 const input={belt:'padded-belt',storage:[],items:[item('a','flash',2.5,5.8,2.5)]};
 const m=resolveUnifiedCarry(input);assert.ok(m.valid);assert.deepEqual(auditInitialUnifiedManifest(input,m),[]);
 const invalid={...m,placements:[...m.placements,structuredClone(m.placements[0])]};
 const errors=auditInitialUnifiedManifest(input,invalid);
 assert.ok(errors.some(e=>e.startsWith('DUPLICATE SLOT')));
 assert.ok(errors.some(e=>e.startsWith('DUPLICATE ITEM')));
});
