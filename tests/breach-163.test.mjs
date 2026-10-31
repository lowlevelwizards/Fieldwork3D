import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {timedHandling,blendedHandlingProfile}
  from '../src/breach-handling-transition.ts';
test('163: transitions interpolate a single rigid gun with no grip split',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const g=weaponGrips(weapon);
  let previous=null,maxJump=0;
  for(let i=0;i<=120;i++){
    const fit=fitWeaponPose({weapon,handling:'ads',blendFrom:'ready',
      blendAlpha:i/120,yaw:0,recoil:0});
    const contact=(x,y,z)=>new THREE.Vector3(x*g.lengthScale,y,z)
      .applyEuler(fit.rotation).add(fit.origin);
    assert.ok(contact(g.primaryX,g.primaryY,1.8).distanceTo(fit.primary)<1e-6);
    assert.ok(contact(g.supportX,g.supportY,-1.6).distanceTo(fit.support)<1e-6);
    if(previous)maxJump=Math.max(maxJump,
      fit.origin.distanceTo(previous.origin),
      fit.stock.distanceTo(previous.stock));
    previous=fit;
  }
  assert.ok(maxJump<1.2,weapon+' transition teleports gun');
 }
});
test('163: seek-sampled handling profiles are reversible and bounded',()=>{
 for(const t of [0,.1,.23,.5,.77,1]){
   const f=blendedHandlingProfile('ready','ads',t,'carbine');
   const b=blendedHandlingProfile('ads','ready',1-t,'carbine');
   assert.ok(Math.abs(f.stockY-b.stockY)<1e-9);
 }
 assert.deepEqual(timedHandling('ready','ads',2,1,2),
   timedHandling('ready','ads',2,1,2));
});
