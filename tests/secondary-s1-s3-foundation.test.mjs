import test from 'node:test';
import assert from 'node:assert/strict';
import {GLOCK_APPEARANCE_REFERENCES,GLOCK_G2_ART,glockArtSockets,
 buildGlockAppearance,clearGlockAppearance}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {initialSecondaryEquipment,emptySecondaryEquipment,
 readSecondaryEquipment,equipFreshSecondary,moveSecondaryHolster,
 secondaryRoundTotal,secondaryLoadMass,SECONDARY_CAPACITY}
 from '../src/secondary-equipment.ts';
import {initialEquipmentLoadout,readEquipmentLoadout,totalEquipmentMass}
 from '../src/equipment-loadouts.ts';
import {initialRoster} from '../src/breach-roster.ts';
import {captureDeploymentInventory} from '../src/equipment-deployment-snapshot.ts';
import {applyQuickPlayKitPreferences,serializeQuickPlayKitPreferences,
 refreshQuickPlayPreparedRoster} from '../src/breach-quickplay-kit-preferences.ts';
import {readFileSync} from 'node:fs';

test('S1: every actual Glock model publishes native grip/muzzle/holster sockets',()=>{
 for(const {id} of GLOCK_APPEARANCE_REFERENCES){
  const sockets=glockArtSockets(id);
  const g=buildGlockAppearance(id);
  try{
   assert.equal(g.userData.glockArtSockets.muzzle.x,GLOCK_G2_ART[id].frontX);
   assert.ok(sockets.primaryGrip.x<sockets.supportGrip.x);
   assert.ok(sockets.magazineBase.y<sockets.magazineSeat.y);
   assert.ok(sockets.holsterPivot.y<sockets.sightLine.y);
   for(const xyz of Object.values(sockets))
    assert.ok(Object.values(xyz).every(Number.isFinite));
   assert.equal(g.children.filter(c=>c.userData.glockIntegratedFrameGrip).length,1);
  }finally{clearGlockAppearance(g);}
 }
});

test('S2: selected Glock has distinct loaded/spare IDs with correct 9mm capacities',()=>{
 for(const {id} of GLOCK_APPEARANCE_REFERENCES){
  const a=initialSecondaryEquipment('rook',id);
  assert.equal(a.loadedRounds,SECONDARY_CAPACITY[id]);
  assert.equal(a.spareMagazines.length,2);
  assert.equal(secondaryRoundTotal(a),3*SECONDARY_CAPACITY[id]);
  assert.equal(new Set([a.loadedMagazineId,...a.spareMagazines.map(m=>m.id)]).size,3);
  assert.deepEqual(readSecondaryEquipment(JSON.parse(JSON.stringify(a)),'rook'),a);
  assert.equal(equipFreshSecondary(a,'rook',id),a,'reselection never refills');
  assert.equal(moveSecondaryHolster(a,'belt-left').holster,'belt-left');
  assert.ok(secondaryLoadMass(a)>.5);
 }
});
test('S2: reject invalid/foreign/duplicate/over-capacity secondary magazines',()=>{
 const good=initialSecondaryEquipment('rook','glock-g19-gen3');
 for(const damaged of [
  {...good,loadedRounds:99},
  {...good,loadedRounds:-1},
  {...good,spareMagazines:[good.spareMagazines[0],good.spareMagazines[0]]},
  {...good,spareMagazines:[{...good.spareMagazines[0],rounds:999}]},
  {...good,spareMagazines:[{...good.spareMagazines[0],location:'fantasy'}]},
  {...good,weapon:'ar-m4a1'}
 ])assert.equal(readSecondaryEquipment(damaged,'rook').weapon,null);
 assert.equal(readSecondaryEquipment(good,'moss').weapon,null,
  'foreign IDs never silently become another operator owned magazines');
 assert.deepEqual(readSecondaryEquipment(null,'rook'),emptySecondaryEquipment());
 const emptyLeft=moveSecondaryHolster(emptySecondaryEquipment(),'belt-left');
 assert.equal(readSecondaryEquipment(emptyLeft,'rook').holster,'belt-left');
 assert.equal(equipFreshSecondary(emptyLeft,'rook','glock-g19-gen3').holster,'belt-left');
 assert.equal(equipFreshSecondary(initialSecondaryEquipment('rook','glock-g19-gen3'),'rook',null).weapon,null);
});
test('S2: legacy primary-only loadouts and Quick Play roster remain compatible',()=>{
 const base=initialEquipmentLoadout('smg');
 assert.equal(base.secondary.weapon,null);
 assert.equal(readEquipmentLoadout({version:1,slots:base.slots},'smg','rook').secondary.weapon,null);
 const side=initialSecondaryEquipment('rook','glock-g26');
 const withSide={...base,secondary:side};
 assert.deepEqual(readEquipmentLoadout(withSide,'smg','rook').secondary,side);
 assert.ok(totalEquipmentMass(withSide)>totalEquipmentMass(base));
 assert.equal(readEquipmentLoadout(withSide,'smg','moss').secondary.weapon,null);
});
test('S3: Quick Play preference round-trip preserves independently selected pistol and location',()=>{
 const roster=initialRoster();
 const input={...roster,members:roster.members.map(m=>m.id==='rook'?{
  ...m,loadout:{...m.loadout,secondary:moveSecondaryHolster(
   initialSecondaryEquipment('rook','glock-g19x'),'belt-left')}
 }:m)};
 const loaded=applyQuickPlayKitPreferences(initialRoster(),
  serializeQuickPlayKitPreferences(input));
 const rook=loaded.members.find(m=>m.id==='rook');
 assert.equal(rook.loadout.secondary.weapon,'glock-g19x');
 assert.equal(rook.loadout.secondary.holster,'belt-left');
 assert.equal(rook.loadout.secondary.loadedRounds,17);
 assert.equal(loaded.members.find(m=>m.id==='moss').loadout.secondary.weapon,null);
 const next=refreshQuickPlayPreparedRoster(loaded);
 assert.equal(next.members.find(m=>m.id==='rook').loadout.secondary.weapon,'glock-g19x');
});
test('G2.8: Arsenal browser is inspection-only; GO-time kit persistence remains separate',()=>{
 const gallery=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/arsenal/gallery-main.ts',import.meta.url),'utf8');
 const chrome=readFileSync(new URL('../src/arsenal/gallery-chrome.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/arsenal/arsenal.css',import.meta.url),'utf8');
 assert.match(main,/SECONDARY WEAPONS/);
 assert.match(chrome,/OPEN WORKBENCH/);
 assert.match(gallery,/factoryGlockRecipe/);
 assert.doesNotMatch(gallery,/serializeQuickPlayKitPreferences|EQUIP GLOCK|combat switching pending/);
 assert.match(css,/arsenal-glock-gallery\[hidden\]/);
 assert.match(css,/arsenal-glock-hero-visual/);
});

test('S3: GO-time detached inventory preserves operator secondary without mutating the saved kit',()=>{
 const base=initialRoster().members[0];
 const prepared={...base,loadout:{...base.loadout,
  secondary:initialSecondaryEquipment(base.id,'glock-g19-gen3')}};
 const snapshot=captureDeploymentInventory(prepared);
 assert.equal(snapshot.equipment.secondary.weapon,'glock-g19-gen3');
 assert.equal(snapshot.equipment.secondary.loadedRounds,15);
 assert.notEqual(snapshot.equipment,prepared.loadout);
 assert.notEqual(snapshot.equipment.secondary,prepared.loadout.secondary);
 assert.equal(prepared.loadout.secondary.spareMagazines.length,2);
});
