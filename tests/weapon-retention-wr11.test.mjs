import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clearRetentionEnvelope} from '../src/breach-weapon-retention-clearance.ts';
import {preferredHandsFreeRegion} from '../src/breach-weapon-retention.ts';
const p={bounds:new THREE.Box3(new THREE.Vector3(-14,-3,-3),new THREE.Vector3(20,4,3)),position:new THREE.Vector3(0,-8,0),quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,-1.1)),scale:new THREE.Vector3(1,1,1),chestHeight:17,armorPush:1,pack:true,rigDepth:1.5,beltDepth:1.25};
test('WR11 transformed silhouette extents clear ground and occupied region',()=>{
 const f=clearRetentionEnvelope({...p,mode:'front-slung'});
 assert.ok(f.box.min.x>=9-1e-6);assert.ok(f.box.min.y+p.chestHeight>=2-1e-6);
 const s=clearRetentionEnvelope({...p,mode:'side-slung'});assert.ok(s.box.min.z>=11.25-1e-6);
 const b=clearRetentionEnvelope({...p,mode:'back-slung'});assert.ok(b.box.max.x<=-13+1e-6);
 assert.equal(clearRetentionEnvelope({...p,mode:'held-one'}).correction.length(),0);
 assert.equal(preferredHandsFreeRegion('two','belt-right'),'front');
 assert.equal(preferredHandsFreeRegion('two','belt-left'),'front');
});
