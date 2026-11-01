import test from 'node:test';import assert from 'node:assert/strict';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {initialWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
test('24.00b clearance slides rigid weapon and both grip sockets together',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const options=[initialWeaponConfiguration(weapon)];
  if(weapon!=='shotgun')options.push(setWeaponAttachment(options[0],
   'foregrip','foregrip-vertical'));
  for(const configuration of options){
   const input={weapon,handling:'short',yaw:.1,recoil:0,aimBlend:.9,configuration};
   const a=fitWeaponPose(input);
   const z=fitWeaponPose({...input,clearanceRetraction:2.35});
   assert.ok(z.stock.x<a.stock.x-2.3,weapon+' stock');
   assert.ok(z.primary.x<a.primary.x-2.3,weapon+' firing hand');
   assert.ok(z.support.x<a.support.x-2.3,weapon+' support hand');
   assert.ok(a.primary.clone().sub(a.stock).distanceTo(
    z.primary.clone().sub(z.stock))<1e-7,weapon+' relative grip');
  }
 }
});
