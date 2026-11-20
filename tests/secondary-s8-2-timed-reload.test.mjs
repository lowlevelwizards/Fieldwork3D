import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {beginTimedSecondaryReload,advanceTimedSecondaryReload,
 selectAccessibleSecondaryMagazine}
 from '../src/secondary-timed-reload.ts';
import {newSession,team,planReload} from '../src/breach-game.ts';
import {executeTacticalUtilityOrder}
 from '../src/breach-order-utility.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {requestSecondarySwitch,advanceSecondarySwitch,initialSecondarySwitch}
 from '../src/secondary-switching.ts';

test('S8.2: exchange commits once at 72% duration, preserving all real magazine serials and rifle ammo',()=>{
 let kit=initialSecondaryEquipment('rook','glock-g19x');
 kit={...kit,loadedRounds:6};
 const initial=secondaryRoundTotal(kit);
 const loadedId=kit.loadedMagazineId,spare=kit.spareMagazines[0].id;
 const begin=beginTimedSecondaryReload(kit,44);
 assert.equal(begin.ok,true);
 assert.equal(begin.state.selectedId,spare);
 let state=begin.state,insertions=0;
 const starting=kit;
 for(let tick=0;tick<180&&state;tick++){
  const step=advanceTimedSecondaryReload(kit,state,1/60);
  assert.equal(step.ok,true);
  if(step.insertedNow)insertions++;
  kit=step.equipment;state=step.state;
  if(tick<15)assert.equal(kit.loadedMagazineId,loadedId,
    'magazine must not teleport into gun at order start');
 }
 assert.equal(state,null);
 assert.equal(insertions,1);
 assert.equal(kit.loadedMagazineId,spare);
 assert.ok(kit.spareMagazines.some(m=>m.id===loadedId&&m.rounds===6));
 assert.equal(secondaryRoundTotal(kit),initial);
 assert.notEqual(kit,starting);
});
test('S8.2: emergency unload records dropped empty magazine without inventing ammo',()=>{
 let kit={...initialSecondaryEquipment('rook','glock-g26'),loadedRounds:0};
 const rounds=secondaryRoundTotal(kit);
 const old=kit.loadedMagazineId;
 let state=beginTimedSecondaryReload(kit,5).state;
 let dropped=null;
 for(let i=0;i<180&&state;i++){
  const step=advanceTimedSecondaryReload(kit,state,1/60);
  if(step.dropped)dropped=step.dropped;
  kit=step.equipment;state=step.state;
 }
 assert.equal(dropped.id,old);
 assert.equal(dropped.rounds,0);
 assert.equal(secondaryRoundTotal(kit),rounds);
 assert.equal(kit.spareMagazines.some(m=>m.id===old),false);
});
test('S8.2: canceled before insertion conserves everything; inaccessible overflow cannot materialize',()=>{
 const kit={...initialSecondaryEquipment('rook','glock-g19-gen3'),
  loadedRounds:3};
 const start=beginTimedSecondaryReload(kit,1);
 const part=advanceTimedSecondaryReload(kit,start.state,.2);
 assert.equal(part.equipment,kit);
 assert.equal(part.insertedNow,false);
 const stranded={...kit,spareMagazines:kit.spareMagazines.map(m=>({
  ...m,location:'overflow'
 }))};
 assert.equal(selectAccessibleSecondaryMagazine(stranded),null);
 assert.equal(beginTimedSecondaryReload(stranded,1).ok,false);
 const selected=kit.spareMagazines[0];
 const gone={...kit,spareMagazines:kit.spareMagazines.slice(1)};
 const missing=advanceTimedSecondaryReload(gone,{...start.state,elapsed:1.0},.2);
 assert.equal(missing.ok,false);
 assert.equal(missing.equipment,gone);
 assert.equal(missing.dropped,null);
 assert.ok(selected.id);
});
test('S8.2: authored RELOAD uses equipped sidearm, not rifle counts or reserve',()=>{
 const s=newSession(),a=team(s)[0];
 const side={...initialSecondaryEquipment(a.id,'glock-g19-gen3'),loadedRounds:2};
 a.equipment={...initialEquipmentLoadout(),secondary:side};
 let held=requestSecondarySwitch(initialSecondarySwitch(),'secondary',side).state;
 for(let i=0;i<60;i++)held=advanceSecondarySwitch(held,1/60,side);
 a.secondarySwitch=held;
 const rifleBefore={magazine:a.magazine,reserve:a.reserve,
  insertedMagazineId:a.insertedMagazineId,
  spare:a.spareMagazines.map(m=>({...m}))};
 assert.equal(planReload(s,a.id),true);
 const hooks={
  pop(actor){actor.plan.shift();},notify(){},beginReload(){throw Error('primary reload invoked')},
  fail(_s,_a,_n,reason){throw Error(reason)},clearIssue(){},rotate(){return true},
  battleEvent(){}
 };
 for(let i=0;i<180&&a.plan.length;i++)
  executeTacticalUtilityOrder(s,a,a.plan[0],1/60,hooks);
 assert.equal(a.plan.length,0);
 assert.equal(a.secondaryReload,null);
 assert.equal(a.equipment.secondary.loadedRounds,15);
 assert.equal(secondaryRoundTotal(a.equipment.secondary),secondaryRoundTotal(side));
 assert.equal(a.magazine,rifleBefore.magazine);
 assert.equal(a.reserve,rifleBefore.reserve);
 assert.equal(a.insertedMagazineId,rifleBefore.insertedMagazineId);
 assert.deepEqual(a.spareMagazines,rifleBefore.spare);
});

test('S8.3: emergency Glock reload creates exactly one serial-accurate dropped magazine',()=>{
 const s=newSession(),a=team(s)[0];
 const kit={...initialSecondaryEquipment(a.id,'glock-g26'),loadedRounds:0};
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 let ready=requestSecondarySwitch(initialSecondarySwitch(),'secondary',kit).state;
 for(let i=0;i<60;i++)ready=advanceSecondarySwitch(ready,1/60,kit);
 a.secondarySwitch=ready;
 const oldId=kit.loadedMagazineId;
 const rifleRounds=a.magazine;
 const ammo=secondaryRoundTotal(kit);
 assert.equal(planReload(s,a.id),true);
 const hooks={pop(actor){actor.plan.shift()},notify(){},clearIssue(){},
  beginReload(){throw Error('cannot reload rifle while pistol drawn')},
  fail(_s,_a,_n,reason){throw Error(reason)},
  rotate(){return true},battleEvent(){}};
 for(let i=0;i<180&&a.plan.length;i++)
  executeTacticalUtilityOrder(s,a,a.plan[0],1/60,hooks);
 assert.equal(a.plan.length,0);
 const drops=s.dropped.filter(m=>m.magazineId===oldId);
 assert.equal(drops.length,1,'one physical ejection, never one per render');
 assert.equal(drops[0].secondaryWeapon,'glock-g26');
 assert.equal(drops[0].rounds,0);
 assert.equal(a.magazine,rifleRounds);
 assert.equal(secondaryRoundTotal(a.equipment.secondary),ammo);
});
