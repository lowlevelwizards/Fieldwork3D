import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {createCivilianRig,updateCivilianRig}
 from '../src/breach-civilian-visuals.ts';
import {civilianStation} from '../src/worldgen/encounter-civilians.ts';
test('R2-B3 fixture families preserve readable mundane activities',()=>{
 assert.equal(civilianStation('clinic','reception-desk','resident').activity,
  'working');
 assert.equal(civilianStation('house','chair','resident').activity,
  'seated');
});
test('R2-B3 pose and small head task gesture reset after replay rewind',()=>{
 const c=createCivilian({id:'civ:r2:activity',role:'employee',
 persona:'steady',activity:'working',position:{x:0,y:0},
 heading:0,roomId:'office',appearanceSeed:7});
 const rig=createCivilianRig(c);
 assert.equal(civilianPose(c),'work');
 updateCivilianRig(rig,c,2.2);
 const before=rig.head.rotation.y;
 updateCivilianRig(rig,c,3.3);
 updateCivilianRig(rig,c,2.2);
 assert.equal(rig.head.rotation.y,before);
 c.state='incapacitated';c.health=0;
 updateCivilianRig(rig,c,5);
 assert.equal(rig.head.rotation.y,0);
 assert.equal(civilianPose(c),'down');
});
test('R2-B3 simple inspecting activity shares workstation animation',()=>{
 const c=createCivilian({id:'civ:r2:inspect',role:'visitor',
 persona:'cautious',activity:'inspecting',position:{x:0,y:0},
 heading:0,roomId:'shop',appearanceSeed:11});
 assert.equal(civilianPose(c),'work');
});
