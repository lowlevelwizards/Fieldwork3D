import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,beginReload,advanceReload} from '../src/breach-game.ts';
import {initialRoster} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {applyDeploymentInventory} from '../src/equipment-deployment-snapshot.ts';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {beginTimedSecondaryReload,advanceTimedSecondaryReload} from '../src/secondary-timed-reload.ts';
import {commitSecondaryReloadStep} from '../src/secondary-reload-commit.ts';
import {deployedCarryLocation,unifiedSecondaryAccess} from '../src/equipment-unified-deployed.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
function setup(){
 const s=newSession(),a=team(s)[0],op=initialRoster().members[0];
 let kit=initialEquipmentLoadout(op.weapon);
 for(const [slot,id] of [['rig','rig-none'],['armor','armor-none'],['belt','belt-padded'],['backpack','backpack-day'],['medical','medical-none'],['utility','utility-none']])kit=setEquipmentChoice(kit,slot,id);
 kit.fieldInventory={version:1,stacks:[]};
 const mags=op.magazines.slice(0,1).map(m=>({...m,rounds:Math.min(8,m.rounds)}));
 const src={...op,wardrobe:undefined,carryMode:'unified',loadout:kit,magazine:2,magazines:mags,reserve:mags.reduce((n,m)=>n+m.rounds,0)};
 applyDeploymentInventory(a,src);
 return {s,a,src,kit};
}
test('BT4 primary retention swaps exactly one occupied cell, even with no vacant holder',()=>{
 const {s,a}=setup(),old=a.insertedMagazineId,incoming=a.spareMagazines[0].id,total=a.magazine+a.reserve;
 const q=deployedCarryLocation(a,incoming);assert.ok(q);
 assert.ok(beginReload(s,a));advanceReload(s,a,a.reloadDuration*.45);
 assert.equal(a.insertedMagazineId,old);assert.equal(a.magazine+a.reserve,total);
 advanceReload(s,a,a.reloadDuration);
 assert.equal(a.insertedMagazineId,incoming);assert.equal(a.magazine+a.reserve,total);
 assert.equal(deployedCarryLocation(a,incoming),null);
 assert.deepEqual(deployedCarryLocation(a,old).placement.slotIds,q.placement.slotIds);
 assert.equal(deployedCarryLocation(a,old).cell,q.cell);
});
test('BT4 interruption before insertion keeps logical stock and its fitted slot',()=>{
 const {s,a}=setup(),before=structuredClone(a.unifiedCarry),old=a.insertedMagazineId,total=a.magazine+a.reserve;
 assert.ok(beginReload(s,a));advanceReload(s,a,a.reloadDuration*.5);
 a.reload=0;a.reloadMode=null;
 assert.equal(a.insertedMagazineId,old);assert.equal(a.magazine+a.reserve,total);
 assert.deepEqual(a.unifiedCarry,before);
 assert.ok(beginReload(s,a));
});
test('BT4 sidearm exchanges exact cell and historical frame restores it',()=>{
 const {s,a,src,kit}=setup();
 kit.secondary={...initialSecondaryEquipment(src.id,'glock-g19-gen3'),loadedRounds:2};
 applyDeploymentInventory(a,{...src,loadout:kit});
 const before=snapshot(s),old=a.equipment.secondary.loadedMagazineId;
 const start=beginTimedSecondaryReload(a.equipment.secondary,0,unifiedSecondaryAccess(a));assert.ok(start.ok);
 const incoming=start.state.selectedId,q=deployedCarryLocation(a,incoming);assert.ok(q);
 let state=start.state;
 while(state){const next=advanceTimedSecondaryReload(a.equipment.secondary,state,.2);assert.ok(commitSecondaryReloadStep(s,a,next));state=next.state;}
 assert.equal(a.equipment.secondary.loadedMagazineId,incoming);
 assert.deepEqual(deployedCarryLocation(a,old).placement.slotIds,q.placement.slotIds);
 assert.equal(deployedCarryLocation(a,old).cell,q.cell);
 const after=snapshot(s);applyReplayFrame(s,before);
 assert.ok(deployedCarryLocation(a,incoming));assert.equal(deployedCarryLocation(a,old),null);
 applyReplayFrame(s,after);assert.ok(deployedCarryLocation(a,old));
 assert.equal(deployedCarryLocation(a,incoming),null);
});
