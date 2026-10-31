import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {muzzleAtShot,MUZZLE_TIP} from '../src/breach-muzzle.ts';
import {fitWeaponPose,handlingPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {wrappedAngle} from '../src/breach-animation-diagnostics.ts';
import {readFileSync} from 'node:fs';

test('171: projectile direction equals the actual solved world barrel axis',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  for(const heading of [-2.9,-1.1,0,.6,2.5]){
   for(const requested of [heading-.7,heading,heading+.75,heading+2]){
    const aim=.96;
    const muzzle=muzzleAtShot({x:30,z:40,heading,weaponYaw:requested,
      weapon,aim,velocity:12,recoil:0});
    const handling=handlingPose({aim,moving:12/72,obstruction:false,
      friendlyNear:false});
    const fit=fitWeaponPose({weapon,handling,
      yaw:-requested+heading,recoil:0,aimBlend:aim});
    const dir=new THREE.Vector3(1,0,0).applyEuler(fit.rotation)
      .applyAxisAngle(new THREE.Vector3(0,1,0),-heading);
    assert.ok(Math.abs(wrappedAngle(muzzle.yaw,
      Math.atan2(dir.z,dir.x)))<1e-8,weapon);
    const point=new THREE.Vector3(MUZZLE_TIP*
      weaponGrips(weapon).lengthScale,0,0)
      .applyEuler(fit.rotation).add(fit.origin)
      .applyAxisAngle(new THREE.Vector3(0,1,0),-heading);
    assert.ok(Math.abs(muzzle.x-30-point.x)<1e-6);
    assert.ok(Math.abs(muzzle.z-40-point.z)<1e-6);
    assert.ok(Number.isFinite(muzzle.pitch));
   }
  }
 }
});
test('171: simulation shots consume physical muzzle yaw and gate excessive relative aim',()=>{
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(game,/const yaw=muzzle.yaw/);
 assert.match(game,/angleDifference\(a.heading,a.weaponYaw\)/);
});
