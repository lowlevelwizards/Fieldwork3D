import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createM56Extras,updateM56Extras} from '../src/operator-ddr-m56-visuals.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
test('R5H2: period net and liner details are independent switchable groups',()=>{
 const parent=new THREE.Group(),v=createM56Extras(parent,new THREE.MeshStandardMaterial());
 assert.equal(v.rivets.visible,false);assert.equal(v.net.visible,false);
 assert.ok(v.net.children.length>0);
 const edges=new THREE.Box3().setFromObject(v.net);
 assert.ok(edges.max.x>6.95&&edges.min.x< -6.95,
  'net reaches visible outside edges of flared M56 steel bowl');
 assert.ok(edges.max.z>8.15&&edges.min.z< -6.75,
  'net border remains outside both swept lower lips');
 updateM56Extras(v,{m56Net:'coarse',m56Details:'early-rivets'});
 assert.equal(v.net.visible,true);assert.equal(v.rivets.visible,true);
 updateM56Extras(v,{m56Net:'none',m56Details:'late-smooth'});
 assert.equal(v.net.visible,false);assert.equal(v.rivets.visible,false);
});
test('R5H2: saved M56 variant fields are validated and additive',()=>{
 const w=initialWardrobe();
 assert.equal(readWardrobe({...w,m56Net:'coarse'}).m56Net,'coarse');
 assert.equal(readWardrobe({...w,m56Details:'early-rivets'}).m56Details,'early-rivets');
 assert.equal(readWardrobe({...w,m56Net:'impossible'}).m56Net,undefined);
});
