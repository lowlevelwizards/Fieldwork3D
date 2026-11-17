import test from 'node:test';
import assert from 'node:assert/strict';
import {H2_AUDIT_MODELS,h2Preset,measureWeapon,measureH2Matrix,
 measureAttachmentTradeoff} from '../scripts/audit-arsenal-h2-handling.mjs';
import {readWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';

const byName=Object.fromEntries(measureH2Matrix().map(x=>[x.name,x]));
test('H2.2 nine actual platform profiles form a deterministic measured matrix',()=>{
 const twice=measureH2Matrix();
 assert.deepEqual(twice,measureH2Matrix());
 assert.equal(twice.length,H2_AUDIT_MODELS.length);
 assert.deepEqual(twice.map(x=>x.name),
  ['M4A1','M16A2','AKM','MP5A3','MP5K','G3A3','FAL 50.00','FNC','G36']);
 for(const entry of twice){
  for(const key of ['nearAimSeconds','farAimSeconds','aimedSpreadRad',
   'swingRadPerSecond','recoveryPerSecond','recoilKickRad',
   'reloadSeconds','overallLength','muzzleX','stockX']){
   assert.ok(Number.isFinite(entry[key]),entry.name+'/'+key);
  }
  assert.ok(entry.nearAimSeconds>0&&entry.reloadSeconds>0);
  assert.ok(entry.overallLength>10&&entry.overallLength<60);
 }
});
test('H2.2 speed and precision profiles reflect real weapon and sight differences',()=>{
 assert.ok(byName.MP5A3.swingRadPerSecond>byName['G3A3'].swingRadPerSecond);
 assert.ok(byName.MP5K.swingRadPerSecond>byName.MP5A3.swingRadPerSecond);
 assert.ok(byName.MP5K.recoilKickRad>byName.MP5A3.recoilKickRad);
 assert.ok(byName.G3A3.reloadSeconds>byName.M16A2.reloadSeconds);
 assert.ok(byName['FAL 50.00'].reloadSeconds>byName.FNC.reloadSeconds);
 assert.ok(byName.M16A2.aimedSpreadRad<byName.MP5A3.aimedSpreadRad);
 assert.equal(byName.G36.sight,'integrated');
 assert.equal(byName.AKM.sight,'open');
 assert.equal(byName.G3A3.sight,'diopter');
});
test('H2.2 attachments and stocks change actual timing without invented hit chances',()=>{
 const x=measureAttachmentTradeoff();
 assert.ok(x.reflex.nearAimSeconds<x.base.nearAimSeconds);
 assert.ok(x.suppressor.swingRadPerSecond<x.base.swingRadPerSecond);
 assert.ok(x.suppressor.overallLength>x.base.overallLength);
 assert.ok(x.collapsed.overallLength<x.base.overallLength);
 assert.ok(x.collapsed.recoilKickRad>x.base.recoilKickRad);
 assert.equal(x.collapsed.muzzleX,x.base.muzzleX);
});
test('H2.2 doorframe: unchanged muzzle never bypasses blocked physical shot',()=>{
 const base=h2Preset('rifle','g36-service');
 const folded=readWeaponConfiguration({...base,stockPosition:'folded'},'rifle');
 const input={x:100,z:70,heading:0,weaponYaw:0,weapon:'rifle',
  aim:1,velocity:0,recoil:0,posture:'stand'};
 const solid={a:{x:118,y:0},b:{x:118,y:140}};
 const a=weaponClearance({...input,weaponConfiguration:base},[],[],[solid]);
 const b=weaponClearance({...input,weaponConfiguration:folded},[],[],[solid]);
 assert.ok(a.blocked||a.muzzle.x<=118);
 assert.ok(b.blocked||b.muzzle.x<=118,
  'folding an actual rear stock cannot authorize a shot through a solid wall');
 assert.equal(measureWeapon(folded).muzzleX,measureWeapon(base).muzzleX);
});
