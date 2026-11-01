import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,setWeaponAttachment,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponLightEmitter,lightBeamFootprint,lightBeamBlockers}
 from '../src/equipment-weapon-light-beam.ts';

test('21.05 2D and 3D agree on the true rail mounted light position',()=>{
 for(const weapon of ['carbine','smg','rifle']){
  const c=setWeaponAttachment(initialWeaponConfiguration(weapon),
   'light','light-compact');
  const gun=resolveWeaponAssembly(c);
  const muzzle={x:50,z:60,yaw:0};
  const emitter=weaponLightEmitter(muzzle,c);
  assert.ok(Math.abs((muzzle.x-emitter.x)-
   (gun.muzzleX-gun.mounted.light.mountX)*gun.lengthScale)<1e-9);
  assert.equal(emitter.y,60);
 }
});
test('21.05 2D footprint stops before solid closed doors',()=>{
 const door={id:'d',a:{x:50,y:0},b:{x:50,y:100},openedAt:0,
  open:false,style:'steel'};
 const polygon=lightBeamFootprint({x:20,y:50},0,lightBeamBlockers([], [door]));
 assert.ok(polygon.slice(1).every(p=>p.x<=50.001));
});
