import test from 'node:test';
import assert from 'node:assert/strict';
import {lightBeamFootprint,LIGHT_BEAM_SAMPLES} from '../src/equipment-weapon-light-beam.ts';
import {initialWeaponConfiguration,setWeaponAttachment,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
test('21.04 mounted light source precedes muzzle for all rail-compatible weapons',()=>{
 for(const weapon of ['carbine','smg','rifle']){
  const config=setWeaponAttachment(initialWeaponConfiguration(weapon),
   'light','light-compact');
  const gun=resolveWeaponAssembly(config);
  assert.ok(gun.muzzleX>gun.mounted.light.mountX);
  assert.ok((gun.muzzleX-gun.mounted.light.mountX)*gun.lengthScale>3);
 }
});
test('21.04 constant sized triangle fan supports cached GPU buffer',()=>{
 const p=lightBeamFootprint({x:10,y:20},0,[]);
 assert.equal((p.length-2)*9,(LIGHT_BEAM_SAMPLES-1)*9);
 for(const point of p)assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
});
