import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {issueWeaponPreset} from '../src/breach-weapon-issue.ts';
import {buildWeaponSilhouette,weaponSilhouetteParts} from '../src/breach-weapon-geometry.ts';
import * as THREE from 'three';

test('replay records full modular weapon build, including edits and seeks',()=>{
 const live=newSession(0,2911),actor=live.operators[0];
 const issued=issueWeaponPreset('ak-ak105');
 actor.weapon=issued.weapon;actor.weaponConfiguration=issued.weaponConfiguration;
 const frame=snapshot(live);
 assert.deepEqual(frame.actors[0].weaponConfiguration,issued.weaponConfiguration);
 assert.notEqual(frame.actors[0].weaponConfiguration,actor.weaponConfiguration);
 actor.weaponConfiguration=issueWeaponPreset('ar-m4a1').weaponConfiguration;
 const playback=newSession(0,2911);
 applyReplayFrame(playback,frame);
 assert.deepEqual(playback.operators[0].weaponConfiguration,issued.weaponConfiguration);
 assert.equal(playback.operators[0].weaponConfiguration?.build?.parts.receiver,'ak105');
});

test('no retired class-only weapons can appear even without saved builds',()=>{
 const steel=new THREE.MeshStandardMaterial(),dark=new THREE.MeshStandardMaterial();
 for(const id of ['smg','carbine','rifle']){
  assert.equal(weaponSilhouetteParts(id).length,0,id+' legacy mesh removed');
  const model=buildWeaponSilhouette(id,steel,dark);
  assert.ok(model.children.length>0,id+' receives authored family');
  assert.ok(model.children.some(child=>child.name.startsWith('family-')),
    id+' must render genuine named family geometry');
  model.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 }
 steel.dispose();dark.dispose();
});
