import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newSession,toggleWeaponLight} from '../src/breach-game.ts';
import {initialRoster,configureRosterWeapon,applyRosterIdentity} from '../src/breach-roster.ts';
import {snapshot} from '../src/breach-replay.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';

test('20.12 mounted lights can be toggled without granting free light equipment',()=>{
 const s=newSession();const roster=initialRoster();
 applyRosterIdentity(s,roster);
 assert.equal(toggleWeaponLight(s,'rook'),false);
 let selected=configureRosterWeapon(roster,'rook','light','light-compact');
 applyRosterIdentity(s,selected);
 const actor=s.operators.find(a=>a.id==='rook');
 assert.equal(actor.weaponLightOn,true);
 assert.equal(toggleWeaponLight(s,'rook'),true);
 assert.equal(actor.weaponLightOn,false);
 assert.equal(toggleWeaponLight(s,'rook'),true);
 assert.equal(snapshot(s).actors.find(a=>a.id==='rook').weaponLightOn,true);
});
test('20.12 weapon lens is a bounded mesh and off until explicitly enabled',()=>{
 let c=initialRoster().members[0].weaponConfiguration;
 c=configureRosterWeapon(initialRoster(),'rook','light','light-compact')
  .members[0].weaponConfiguration;
 const material=new THREE.MeshStandardMaterial();
 const model=buildWeaponAccessories(c,material,material);
 const lens=model.getObjectByName('weapon-light-lens');
 assert.ok(lens instanceof THREE.Mesh);
 assert.equal(lens.visible,false);
 assert.ok(model.children.length<28);
 for(const child of model.children)if(child instanceof THREE.Mesh)child.geometry.dispose();
 material.dispose();
});
test('20.12 unmounted lens stays absent and incompatible flashlight is refused',()=>{
 const roster=initialRoster();
 const c=roster.members.find(m=>m.weapon==='shotgun').weaponConfiguration;
 const material=new THREE.MeshStandardMaterial();
 const model=buildWeaponAccessories(c,material,material);
 assert.equal(model.getObjectByName('weapon-light-lens'),undefined);
 assert.equal(configureRosterWeapon(roster,'vale','light','light-compact'),roster);
 for(const child of model.children)if(child instanceof THREE.Mesh)child.geometry.dispose();
 material.dispose();
});
