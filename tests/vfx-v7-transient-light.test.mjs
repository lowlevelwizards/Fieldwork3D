import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TransientLightPreview,transientLightIntensity,TRANSIENT_LIGHT_LIMIT} from '../src/rendering/breach-transient-light-preview.ts';
test('V7 finite age decay and hard expiry',()=>{
 for(const channel of ['muzzle','flash']){
  assert.ok(transientLightIntensity(channel,0)>transientLightIntensity(channel,.04));
  assert.equal(transientLightIntensity(channel,-1),0);
  assert.equal(transientLightIntensity(channel,1),0);
  assert.equal(transientLightIntensity(channel,NaN),0);
 }
 assert.equal(transientLightIntensity('muzzle',0,0),0);
});
test('V7 fixed two shadowless lights, strongest eligible event and deterministic reset',()=>{
 const root=new THREE.Scene(),p=new TransientLightPreview(root);
 assert.equal(root.children.length,TRANSIENT_LIGHT_LIMIT);
 assert.ok(root.children.every(l=>l.isPointLight&&!l.castShadow));
 p.begin();p.offer('muzzle',1,10,12,30,0);
 p.offer('muzzle',2,20,12,30,.06);
 assert.equal(p.muzzle.position.x,10);
 p.offer('muzzle',3,40,12,30,0);assert.equal(p.muzzle.position.x,40);
 p.offer('flash',4,50,13,70,0);assert.ok(p.flash.intensity>0);
 p.reset();assert.equal(p.muzzle.intensity,0);assert.equal(p.flash.intensity,0);
 assert.equal(root.children.length,2);p.dispose();assert.equal(root.children.length,0);
});
