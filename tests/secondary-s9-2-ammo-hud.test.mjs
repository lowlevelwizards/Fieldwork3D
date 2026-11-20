import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {tacticalActiveAmmo} from '../src/tactical-active-ammo.ts';

test('S9.2: tactical readout keeps an independently loaded pistol and primary inventory',()=>{
 const s=newSession(),a=team(s)[0];
 const rifle={loaded:a.magazine,reserve:a.reserve};
 a.equipment={...initialEquipmentLoadout(),
  secondary:{...initialSecondaryEquipment(a.id,'glock-g26'),loadedRounds:3}};
 const first=tacticalActiveAmmo(a);
 assert.equal(first.hand,'primary');
 assert.equal(first.loaded,rifle.loaded);
 assert.equal(first.reserve,rifle.reserve);
 const planned=tacticalActiveAmmo(a,'secondary');
 assert.equal(planned.hand,'secondary');
 assert.equal(planned.label,'GLOCK G26');
 assert.equal(planned.loaded,3);
 assert.equal(planned.capacity,10);
 assert.equal(planned.reserve,20);
 assert.equal(planned.spareMagazines,2);
 a.secondarySwitch={active:'secondary',desired:'secondary',fraction:1};
 const shown=tacticalActiveAmmo(a);
 assert.deepEqual(shown,planned);
 assert.equal(a.magazine,rifle.loaded);
});
test('S9.2: HUD progress and ammunition follow real timed pistol reload state',()=>{
 const s=newSession(),a=team(s)[0];
 const kit=initialSecondaryEquipment(a.id,'glock-g19x');
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 a.secondarySwitch={active:'secondary',desired:'secondary',fraction:1};
 a.secondaryReload={orderId:16,selectedId:kit.spareMagazines[0].id,
  elapsed:.6,duration:1.2,retain:true,inserted:false};
 const state=tacticalActiveAmmo(a);
 assert.equal(state.reloading,true);
 assert.equal(state.reloadProgress,.5);
 assert.equal(state.loaded,17);
 assert.equal(state.capacity,17);
 assert.equal(state.reserve,34);
 a.secondaryReload=null;
 assert.equal(tacticalActiveAmmo(a).reloading,false);
 a.equipment={...a.equipment,secondary:{...kit,loadedRounds:0}};
 assert.equal(tacticalActiveAmmo(a).loaded,0);
 assert.equal(tacticalActiveAmmo(a).reserve,34);
});
test('S9.2: a missing secondary never fabricates capacity or reserve when projected',()=>{
 const s=newSession(),a=team(s)[0];
 const expected=tacticalActiveAmmo(a);
 assert.deepEqual(tacticalActiveAmmo(a,'secondary'),expected);
});
