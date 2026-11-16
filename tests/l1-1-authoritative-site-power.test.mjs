import test from 'node:test';
import assert from 'node:assert/strict';
import {l1BaselineSite,L1_BASELINE_LAYOUTS,L1_BASELINE_MODES}
 from '../scripts/audit-l1-lighting-baseline.mjs';
import {planSiteLighting,siteLightingTopology}
 from '../src/equipment-site-lighting.ts';
import {createSitePowerState,setSiteCircuitPower,setSiteFixtureSwitch,
 setSessionLightingMode,copySitePowerState}
 from '../src/equipment-site-power.ts';
import {newSession,toggleWeaponLight} from '../src/breach-game.ts';
import {actorLightingLevels} from '../src/equipment-sight-lighting.ts';
import {initialWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {captureReplayManifest} from '../src/breach-replay-manifest.ts';
import {captureMissionStart} from '../src/breach-mission-restart.ts';

const session=(mode='night')=>{
 const site=l1BaselineSite();
 const s=newSession(0,undefined,'floor-plan','small','hold',site);
 setSessionLightingMode(s,mode);
 return s;
};

test('L1.1 initial physical supply is byte-for-byte equivalent to all legacy presets',()=>{
 for(const layout of L1_BASELINE_LAYOUTS){
  const site=l1BaselineSite(layout);
  for(const mode of L1_BASELINE_MODES){
   const legacy=planSiteLighting(site,mode);
   const power=createSitePowerState(site,mode);
   assert.deepEqual(planSiteLighting(site,mode,power),legacy,
    layout+' / '+mode);
   assert.equal(power.revision,0);
  }
  site.condition='vacant';
  for(const mode of L1_BASELINE_MODES)
   assert.deepEqual(planSiteLighting(site,mode,createSitePowerState(site,mode)),
    planSiteLighting(site,mode),'vacant / '+layout+' / '+mode);
 }
});
test('L1.1 topology contains stable dark fixtures and two mains plus backup circuits',()=>{
 const site=l1BaselineSite();
 const topology=siteLightingTopology(site);
 assert.equal(topology.length,site.rooms.length);
 assert.equal(new Set(topology.map(f=>f.id)).size,topology.length);
 assert.ok(topology.some(f=>f.mainCircuit==='mains:0'));
 assert.ok(topology.some(f=>f.mainCircuit==='mains:1'));
 assert.ok(topology.some(f=>f.backupEligible));
 const state=createSitePowerState(site,'blackout');
 assert.equal(state.circuits['mains:0'],false);
 assert.equal(state.circuits['mains:1'],false);
 assert.equal(state.circuits['backup:emergency'],true);
 assert.deepEqual(Object.keys(state.switches).sort(),
  topology.map(f=>f.id).sort());
 assert.deepEqual(siteLightingTopology(site),topology);
 assert.deepEqual(siteLightingTopology({...site,rooms:[]}),[]);
 assert.deepEqual(planSiteLighting({...site,rooms:[]},'blackout',
  createSitePowerState({...site,rooms:[]},'blackout')).fixtures,[]);
});
test('L1.1 independent mains and backup control only their own fixtures',()=>{
 const s=session('night'),site=s.site;
 const topology=siteLightingTopology(site);
 const mains0=topology.filter(f=>f.mainCircuit==='mains:0').map(f=>f.id);
 const mains1=topology.filter(f=>f.mainCircuit==='mains:1').map(f=>f.id);
 const before=planSiteLighting(site,s.lightingMode,s.sitePower);
 assert.equal(setSiteCircuitPower(s,'mains:0',false),true);
 const after=planSiteLighting(site,s.lightingMode,s.sitePower);
 assert.ok(after.fixtures.length<before.fixtures.length);
 assert.ok(after.fixtures.every(f=>!mains0.includes(f.id)));
 assert.deepEqual(after.fixtures.filter(f=>mains1.includes(f.id)),
  before.fixtures.filter(f=>mains1.includes(f.id)));
 assert.equal(setSiteCircuitPower(s,'mains:0',false),false);
 assert.equal(setSiteCircuitPower(s,'invalid:circuit',true),false);
 const revision=s.sitePower.revision;
 assert.equal(setSiteCircuitPower(s,'backup:emergency',true),true);
 assert.equal(s.sitePower.revision,revision+1);
 const backup=planSiteLighting(site,s.lightingMode,s.sitePower);
 assert.ok(backup.fixtures.some(f=>f.power==='backup'&&mains0.includes(f.id)));
 const target=backup.fixtures.find(f=>f.power==='backup');
 assert.ok(target);
 assert.equal(setSiteFixtureSwitch(s,target.id,false),true);
 assert.ok(!planSiteLighting(site,s.lightingMode,s.sitePower)
  .fixtures.some(f=>f.id===target.id));
 assert.equal(setSiteFixtureSwitch(s,'unknown:light',false),false);
 assert.equal(setSiteFixtureSwitch(s,target.id,false),false);
 assert.equal(setSiteFixtureSwitch(s,target.id,true),true);
});
test('L1.1 power changes invalidate actor illumination within same eight-Hz bucket',()=>{
 const s=session('night'),site=s.site;
 const fixture=siteLightingTopology(site).find(f=>f.mainCircuit==='mains:0');
 const actor=s.operators.find(a=>a.id==='rook');
 assert.ok(actor&&fixture);
 actor.p={...fixture.p};
 const before=actorLightingLevels(s),oldRev=s.objectRevision;
 const oldBucket=Math.floor(s.seconds*8);
 assert.equal(actorLightingLevels(s),before);
 assert.equal(setSiteCircuitPower(s,'mains:0',false),true);
 assert.equal(s.objectRevision,oldRev);
 assert.equal(Math.floor(s.seconds*8),oldBucket);
 const after=actorLightingLevels(s);
 assert.notEqual(after,before);
 assert.ok((after.get(actor.id)??1)<(before.get(actor.id)??0));
 assert.equal(actorLightingLevels(s),after);
 assert.equal(setSiteCircuitPower(s,'mains:0',true),true);
 assert.notEqual(actorLightingLevels(s),after);
});
test('L1.1 weapon-light toggle invalidates without a new tick or extra fog',()=>{
 const s=session(),a=s.operators.find(a=>a.id==='rook');
 assert.ok(a);
 a.weaponConfiguration=setWeaponAttachment(
  initialWeaponConfiguration(a.weapon),'light','light-compact');
 const groundBefore=s.seenGround.size,revision=s.objectRevision;
 const field=actorLightingLevels(s),illumRev=s.illuminationRevision;
 assert.equal(toggleWeaponLight(s,a.id),true);
 assert.equal(s.illuminationRevision,illumRev+1);
 assert.notEqual(actorLightingLevels(s),field);
 assert.equal(s.objectRevision,revision);
 assert.equal(s.seenGround.size,groundBefore);
});
test('L1.1 replay snapshots and mission start manifest copy circuit state',()=>{
 const s=session();
 const original=captureMissionStart(s,'small');
 const base=snapshot(s),initialState=copySitePowerState(s.sitePower);
 assert.equal(setSiteCircuitPower(s,'mains:1',false),true);
 const altered=snapshot(s);
 assert.equal(base.sitePower.circuits['mains:1'],true);
 assert.equal(altered.sitePower.circuits['mains:1'],false);
 assert.equal(original.sitePower.circuits['mains:1'],true);
 assert.equal(captureReplayManifest(s).sitePower.circuits['mains:1'],false);
 applyReplayFrame(s,base);
 assert.deepEqual(s.sitePower,initialState);
 applyReplayFrame(s,altered);
 assert.equal(s.sitePower.circuits['mains:1'],false);
 // Pre-L1.1 films had no circuit snapshot: their preset remains valid.
 applyReplayFrame(s,{...base,sitePower:undefined});
 assert.deepEqual(s.sitePower,createSitePowerState(s.site,s.lightingMode));
});
test('L1.1 preset changes reset only circuit defaults, not geometry or intel',()=>{
 const s=session('night'),site=s.site;
 const observed=s.seenGround.size,doors=s.doors.length;
 assert.equal(setSiteCircuitPower(s,'mains:0',false),true);
 setSessionLightingMode(s,'blackout');
 assert.equal(s.sitePower.mode,'blackout');
 assert.equal(s.sitePower.revision,0);
 assert.equal(s.sitePower.circuits['backup:emergency'],true);
 assert.equal(s.sitePower.circuits['mains:0'],false);
 assert.equal(s.site,site);
 assert.equal(s.seenGround.size,observed);
 assert.equal(s.doors.length,doors);
 // Direct writes from pre-L1.1 callers must still select the legacy preset.
 s.lightingMode='day';
 assert.deepEqual(planSiteLighting(site,'day',s.sitePower),
  planSiteLighting(site,'day'));
});
