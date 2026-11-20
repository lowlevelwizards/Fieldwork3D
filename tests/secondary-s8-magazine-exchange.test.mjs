import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSecondaryEquipment,readSecondaryEquipment,
 secondaryRoundTotal} from '../src/secondary-equipment.ts';
import {exchangeSecondaryMagazine,selectSecondaryReloadMagazine}
 from '../src/secondary-magazine-exchange.ts';

const issue=()=>initialSecondaryEquipment('rook','glock-g19x');

test('S8.1: tactical reload exchanges issued serials without minting ammunition',()=>{
 const stock=issue(),used={...stock,loadedRounds:8};
 const selected=selectSecondaryReloadMagazine(used);
 assert.equal(selected,stock.spareMagazines[0].id);
 const swapped=exchangeSecondaryMagazine(used,selected,true);
 assert.equal(swapped.ok,true);
 assert.equal(swapped.equipment.loadedMagazineId,selected);
 assert.equal(swapped.equipment.loadedRounds,17);
 assert.equal(swapped.equipment.spareMagazines.length,2);
 const former=swapped.equipment.spareMagazines.find(x=>x.id===stock.loadedMagazineId);
 assert.equal(former?.rounds,8);
 assert.equal(former?.location,stock.spareMagazines[0].location);
 assert.equal(secondaryRoundTotal(swapped.equipment),secondaryRoundTotal(used));
 assert.deepEqual(readSecondaryEquipment(JSON.parse(JSON.stringify(swapped.equipment)),'rook'),
  swapped.equipment,'persisted exchanged serial must stay valid');
});

test('S8.1: emergency exchange drops old identity, preserves total world rounds',()=>{
 const stock=issue(),empty={...stock,loadedRounds:0};
 const chosen=stock.spareMagazines[1].id;
 const exchanged=exchangeSecondaryMagazine(empty,chosen,false);
 assert.equal(exchanged.ok,true);
 assert.equal(exchanged.equipment.spareMagazines.length,1);
 assert.equal(exchanged.dropped.id,stock.loadedMagazineId);
 assert.equal(exchanged.dropped.rounds,0);
 assert.equal(exchanged.equipment.loadedMagazineId,chosen);
 assert.equal(secondaryRoundTotal(exchanged.equipment)+exchanged.dropped.rounds,
  secondaryRoundTotal(empty));
 const noRefill=exchangeSecondaryMagazine(exchanged.equipment,stock.loadedMagazineId,false);
 assert.equal(noRefill.ok,false);
 assert.equal(noRefill.equipment,exchanged.equipment);
});

test('S8.1: illegal, empty, lower-round or wrong-owner mags never replace a weapon',()=>{
 const stock=issue();
 for(const id of ['nobody/secondary/glock-g19x/spare-0',stock.loadedMagazineId,'ghost']){
  const attempt=exchangeSecondaryMagazine(stock,id,true);
  assert.equal(attempt.ok,false);
  assert.equal(attempt.equipment,stock);
 }
 const used={...stock,loadedRounds:12,
  spareMagazines:stock.spareMagazines.map((m,i)=>({
   ...m,rounds:i===0?2:0
  }))};
 assert.equal(selectSecondaryReloadMagazine(used),null);
 assert.equal(exchangeSecondaryMagazine(used,stock.spareMagazines[0].id,true).ok,false);
});

test('S8.1: swapped magazine owner identity validation rejects duplicates and impostors',()=>{
 const stock=issue();
 const swapped=exchangeSecondaryMagazine({...stock,loadedRounds:5},
  stock.spareMagazines[0].id,true).equipment;
 assert.equal(readSecondaryEquipment(swapped,'rook').weapon,'glock-g19x');
 assert.equal(readSecondaryEquipment(swapped,'moss').weapon,null);
 assert.equal(readSecondaryEquipment({...swapped,spareMagazines:[
  ...swapped.spareMagazines,{...swapped.spareMagazines[0]}
 ]},'rook').weapon,null);
 assert.equal(readSecondaryEquipment({...swapped,loadedMagazineId:
  'rook/secondary/glock-g19x/forged'},'rook').weapon,null);
});
