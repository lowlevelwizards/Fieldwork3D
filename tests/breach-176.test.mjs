import test from 'node:test';
import assert from 'node:assert/strict';
import {turnHierarchy,turnDelta} from '../src/breach-turn-hierarchy.ts';
import {readFileSync} from 'node:fs';
test('176: graduated head/shoulder/pelvis turn remains anatomically bounded',()=>{
 for(const heading of [-3.0,-1.4,0,1.7,3.0]){
  for(const target of [-3.0,-.8,0,1.2,3]){
   const r=turnHierarchy({pelvisYaw:0,bodyHeading:heading,
      targetHeading:target,speed:0,aiming:true});
   assert.ok(Math.abs(r.chestYaw)<=.700001);
   assert.ok(Math.abs(r.headYaw)<=.430001);
   assert.ok(Number.isFinite(r.extraWeaponYaw));
  }
 }
 assert.ok(Math.abs(turnDelta(Math.PI-.01,-Math.PI+.01))<.03);
});
test('176: head has distinct remaining aim authority, footsteps requested only when turning',()=>{
 const still=turnHierarchy({pelvisYaw:0,bodyHeading:0,
  targetHeading:0,speed:0,aiming:false});
 assert.equal(still.headYaw,0);
 const angled=turnHierarchy({pelvisYaw:0,bodyHeading:1.2,
  targetHeading:1.5,speed:0,aiming:true});
 assert.ok(angled.needsFootTurn);
 const moving=turnHierarchy({pelvisYaw:0,bodyHeading:1.2,
  targetHeading:1.5,speed:40,aiming:true});
 assert.equal(moving.needsFootTurn,false);
});
test('176: rig uses one chest/head turning authority after pelvis rotation',()=>{
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(rig,/const turn=turnHierarchy\(/);
 assert.doesNotMatch(rig,/const lookTwist=/);
 assert.doesNotMatch(rig,/const torsoDelta=/);
});
