import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {exchangeSecondaryMagazine}
 from '../src/secondary-magazine-exchange.ts';
import {snapshot,applyReplayFrame}
 from '../src/breach-replay.ts';

test('S10.2: seeking an earlier replay frame restores loaded Glock rounds and physical serial IDs',()=>{
 const s=newSession(),a=team(s)[0];
 const kit={...initialSecondaryEquipment(a.id,'glock-g19x'),loadedRounds:4};
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 const original=snapshot(s);
 const old=original.actors.find(actor=>actor.id===a.id);
 assert.equal(old.secondaryEquipment.loadedRounds,4);
 const selected=kit.spareMagazines[0].id;
 const x=exchangeSecondaryMagazine(kit,selected,true);
 assert.equal(x.ok,true);
 a.equipment={...a.equipment,secondary:x.equipment};
 const later=snapshot(s);
 const total=secondaryRoundTotal(kit);
 assert.equal(later.actors.find(actor=>actor.id===a.id).secondaryEquipment.loadedMagazineId,selected);
 assert.equal(secondaryRoundTotal(later.actors.find(actor=>actor.id===a.id).secondaryEquipment),total);
 applyReplayFrame(s,original);
 assert.equal(a.equipment.secondary.loadedMagazineId,kit.loadedMagazineId);
 assert.equal(a.equipment.secondary.loadedRounds,4);
 assert.equal(secondaryRoundTotal(a.equipment.secondary),total);
 applyReplayFrame(s,later);
 assert.equal(a.equipment.secondary.loadedMagazineId,selected);
 assert.equal(a.equipment.secondary.loadedRounds,17);
 assert.equal(secondaryRoundTotal(a.equipment.secondary),total);
 applyReplayFrame(s,original);
 assert.equal(a.equipment.secondary.loadedMagazineId,kit.loadedMagazineId);
});
test('S10.2: canceled reload and legacy film reset transient reload without conjuring a magazine',()=>{
 const s=newSession(),a=team(s)[0];
 const kit={...initialSecondaryEquipment(a.id,'glock-g26'),loadedRounds:1};
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 a.secondaryReload={orderId:19,selectedId:kit.spareMagazines[0].id,
  elapsed:.4,duration:1.2,retain:true,inserted:false};
 const mid=snapshot(s);
 assert.equal(mid.actors.find(x=>x.id===a.id).secondaryReload.elapsed,.4);
 a.secondaryReload=null;
 const canceled=snapshot(s);
 applyReplayFrame(s,mid);
 assert.equal(a.secondaryReload.elapsed,.4);
 assert.equal(a.equipment.secondary.loadedRounds,1);
 applyReplayFrame(s,canceled);
 assert.equal(a.secondaryReload,null);
 const legacy={...mid,actors:mid.actors.map(actor=>{
  const {secondaryEquipment:_removed,secondaryReload:_removedTimer,...other}=actor;
  return other;
 })};
 a.secondaryReload={orderId:20,selectedId:'bad',
  elapsed:1,duration:1.2,retain:false,inserted:false};
 applyReplayFrame(s,legacy);
 assert.equal(a.secondaryReload,null);
});
