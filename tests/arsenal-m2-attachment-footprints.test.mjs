/** Arsenal M2.2: read-only fit, real rail support, occupancy and eye relief. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions,physicalAttachmentFootprint,
 previewPhysicalMountBuild}
 from '../src/weapons/geometry/weapon-physical-mount-fit.ts';

function factory(id){
 const p=FAMILY_PRESETS.find(f=>f.id===id);
 assert.ok(p,id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
}
const fit=(c,id,occupied=[])=>physicalAttachmentFitOptions(c,id,occupied);
const reasons=(c,id)=>fit(c,id).reasons;
const near=(v,n,label)=>assert.ok(Math.abs(v-n)<.001,label+': '+v+' != '+n);

test('M2.2 all factory configs get deterministic read-only footprint previews',()=>{
 for(const f of FAMILY_PRESETS){
  const c=factory(f.id),initial=JSON.stringify(c);
  const one=previewPhysicalMountBuild(c);
  assert.deepEqual(previewPhysicalMountBuild(c),one,f.id);
  assert.equal(JSON.stringify(c),initial,f.id+' configuration mutated');
  assert.ok(one.placements.every(p=>p.supportIds.length>0),f.id);
  assert.ok(one.unresolved.every(u=>!u.feasible),f.id);
 }
});

test('M2.2 AR reflex and magnified need two distinct actual receiver teeth',()=>{
 const c=factory('ar-m4a1');
 for(const id of ['optic-reflex','optic-magnified']){
  const response=fit(c,id);
  assert.equal(response.feasible,true,id);
  assert.ok(response.options.length>=2,id);
  for(const placement of response.options){
   assert.equal(placement.face,'top');
   assert.equal(placement.ownerPartId,'ar-flat');
   assert.equal(placement.supportIds.length,2,id+' cannot clamp to one tooth');
   assert.notEqual(placement.supportIds[0],placement.supportIds[1]);
   assert.ok(placement.clearanceEndX>placement.clearanceStartX);
  }
 }
 const magnified=fit(c,'optic-magnified');
 near(magnified.options[0].x,.15,'existing two-ring sight center preferred');
 const reflex=fit(c,'optic-reflex');
 near(reflex.options[0].x,0,'reflex defaults to existing center');
 assert.ok(physicalAttachmentFootprint('optic-magnified').bodyHalfX>
  physicalAttachmentFootprint('optic-reflex').bodyHalfX);
});

test('M2.2 AR handstop and grip use structural rail, not decorative tooth width',()=>{
 const c=factory('ar-m4a1');
 const stop=fit(c,'foregrip-handstop');
 const grip=fit(c,'foregrip-vertical');
 assert.equal(stop.feasible,true);
 assert.equal(grip.feasible,true);
 assert.ok(grip.options.every(o=>o.supportIds.length===1));
 assert.ok(grip.options.length<=stop.options.length,
  'longer base cannot gain clearance positions');
 const names=new Set(grip.options.map(o=>o.supportIds[0]));
 assert.equal(names.size,grip.options.length,'no duplicate contact identities');
 assert.ok(grip.options.every(o=>o.x>4&&o.x<12.2));
});

test('M2.2 real AR and MP5 rail lights offer both handed positions',()=>{
 for(const c of [factory('ar-m4a1'),
  setConfiguredFamilyPart(factory('hk-mp5a3'),'handguard','hk-mp5-trirail')]){
  const lights=fit(c,'light-compact');
  assert.equal(lights.feasible,true);
  assert.ok(lights.options.some(o=>o.face==='left'),c.build.parts.handguard);
  assert.ok(lights.options.some(o=>o.face==='right'),c.build.parts.handguard);
  assert.ok(lights.options.every(o=>o.supportIds.length===1));
  assert.ok(lights.options.every(o=>o.face==='left'?o.z<0:o.z>0));
 }
 const covered=setConfiguredFamilyPart(factory('ar-mk18'),
  'handguard','ar-compact-rail');
 assert.deepEqual(reasons(covered,'light-compact'),['no-physical-interface']);
 assert.deepEqual(reasons(factory('ar-m16a1'),'foregrip-vertical'),
  ['no-physical-interface']);
});

test('M2.2 AK forward rail accepts reflex but rejects long eye relief magnified',()=>{
 let c=setConfiguredFamilyPart(factory('ak-ak74m'),'handguard','ak-rail-long');
 assert.equal(c.build.parts.handguard,'ak-rail-long');
 const reflex=fit(c,'optic-reflex');
 assert.equal(reflex.feasible,true);
 assert.ok(reflex.options.every(p=>p.ownerPartId==='ak-rail-long'&&
  p.face==='top'&&p.supportIds.length===1));
 assert.deepEqual(reasons(c,'optic-magnified'),['forward-eye-relief']);
 assert.deepEqual(reasons(c,'foregrip-vertical'),['no-physical-interface']);
 assert.deepEqual(reasons(c,'light-compact'),['no-physical-interface']);
 // Earlier saved optics are reported, never deleted by a preview.
 c=setWeaponAttachment(c,'optic','optic-magnified');
 const loaded=readWeaponConfiguration(JSON.parse(JSON.stringify(c)),c.weapon);
 assert.equal(loaded.slots.optic,'optic-magnified');
 assert.equal(previewPhysicalMountBuild(loaded).unresolved[0]?.reasons[0],
  'forward-eye-relief');
 assert.equal(loaded.slots.optic,'optic-magnified');
});

test('M2.2 HK claw adapter needs all four contacts; optic needs installed adapter',()=>{
 let c=factory('hk-g3a3');
 const claw=fit(c,'optic-hk-claw');
 assert.equal(claw.feasible,true);
 assert.equal(claw.options.length,1);
 assert.equal(claw.options[0].supportIds.length,4);
 assert.equal(new Set(claw.options[0].supportIds).size,4);
 assert.deepEqual(reasons(c,'optic-reflex'),['missing-adapter']);
 c=setWeaponAttachment(c,'opticMount','optic-hk-claw');
 for(const opticId of ['optic-reflex','optic-magnified']){
  const optic=fit(c,opticId);
  assert.equal(optic.feasible,true,opticId);
  assert.ok(optic.options.every(o=>o.ownerPartId==='optic-hk-claw'));
 }
 c=setWeaponAttachment(c,'optic','optic-magnified');
 const preview=previewPhysicalMountBuild(c);
 assert.equal(preview.unresolved.length,0);
 assert.deepEqual(preview.placements.map(p=>p.attachmentId),
  ['optic-hk-claw','optic-magnified']);
});

test('M2.2 occupancy blocks same-face longitudinal overlaps, not opposite sides',()=>{
 const c=factory('ar-m4a1');
 const available=fit(c,'light-compact');
 assert.equal(available.feasible,true);
 // Simulated reserved rail sites for a future side-mounted laser. The current
 // equipment catalog has no selectable laser, so do not create a fake item.
 const reserved=available.options.map(o=>({
  ...o,attachmentId:'future-side-accessory',attachmentSlot:'foregrip'
 }));
 const blocked=fit(c,'light-compact',reserved);
 assert.deepEqual(blocked.options,[]);
 assert.deepEqual(blocked.reasons,['occupied']);
 assert.equal(blocked.feasible,false);
 const justRight=reserved.filter(o=>o.face==='right');
 const opposite=fit(c,'light-compact',justRight);
 assert.equal(opposite.feasible,true);
 assert.ok(opposite.options.every(o=>o.face==='left'));
});

test('M2.2 explicit mounting does not silently retrofit old furniture or G36',()=>{
 for(const id of ['ak-akm','ak-ak74','ar-m16a1','fal-5000']){
  const c=factory(id),snapshot=JSON.stringify(c);
  assert.deepEqual(reasons(c,'light-compact'),['no-physical-interface'],id);
  assert.equal(JSON.stringify(c),snapshot,'fit cannot upgrade the handguard');
 }
 const g=FAMILY_PRESETS.find(p=>p.family==='g36');
 assert.ok(g);
 assert.deepEqual(reasons(factory(g.id),'optic-reflex'),
  ['no-physical-interface']);
 assert.equal(fit(factory('ar-m4a1'),'fake-laser').feasible,false);
 assert.deepEqual(fit(factory('ar-m4a1'),'fake-laser').reasons,
  ['unknown-attachment']);
});

test('M2.2 catalog and rendered geometry remain unmodified after queries',()=>{
 const c=factory('ar-m4a1');
 const original=JSON.stringify(c);
 const tests=['optic-reflex','optic-magnified','foregrip-vertical',
  'foregrip-handstop','light-compact','optic-hk-claw'];
 for(const id of tests)fit(c,id);
 assert.equal(JSON.stringify(c),original);
 assert.equal(c.slots.light,'light-none');
 assert.equal(c.slots.optic,'optic-irons');
});
