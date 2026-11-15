import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {doorSwingBlocked} from '../src/breach-door.ts';
import {OPERATOR_RADIUS} from '../src/breach-core.ts';
import {orientGeneratedDoorSwings,GENERATED_DOOR_PASSAGE_FRACTION}
 from '../src/worldgen/generated-door-swing.ts';
const fixture=(seed,type)=>generateSite(seed,'small',undefined,
 {enableIncidentIntent:false,enemyCount:0,civilianCount:0},
 {archetype:type});
const clearance=(site,door)=>doorSwingBlocked(
 {...door,open:false,openFraction:0},GENERATED_DOOR_PASSAGE_FRACTION,
 [],OPERATOR_RADIUS,{site,walls:site.walls,cover:site.cover,revision:0});
test('D3.13C corrects a physically untraversable front swing in a house',()=>{
 const site=fixture(728413,'house');
 const door=site.doors.find(d=>d.id==='FRONT');
 assert.ok(door);
 assert.equal(clearance(site,door),false,'opening must reach physical passage angle');
 assert.equal(clearance(site,{...door,swing:door.swing===1?-1:1}),true,
  'the alternate swing actually collides with static geometry');
});
test('D3.13C corrects independent utility frontage with the same general rule',()=>{
 const site=fixture(1284000,'utility');
 const door=site.doors.find(d=>d.id==='FRONT');
 assert.ok(door);
 assert.equal(clearance(site,door),false);
 assert.equal(clearance(site,{...door,swing:door.swing===1?-1:1}),true);
});
test('D3.13C never reverses a healthy, double, sliding or both-blocked door',()=>{
 const site=fixture(739544,'townhouse');
 const unaltered=orientGeneratedDoorSwings(site);
 assert.equal(unaltered,site,'already viable archetype should retain identity');
 const fake={...site,doors:site.doors.map((d,i)=>i===0?
  {...d,kind:'sliding'}:d)};
 const converted=orientGeneratedDoorSwings(fake);
 assert.equal(converted.doors[0].swing,fake.doors[0].swing);
});
test('D3.13C changes only procedural hinged orientation, not geometric physicality',()=>{
 for(const [seed,type] of [[728413,'house'],[1284000,'utility']]){
  const first=fixture(seed,type);
  const again=orientGeneratedDoorSwings(first);
  assert.equal(again,first,'idempotent on a completed generated site');
  for(const door of first.doors){
   if(door.kind==='sliding'||door.kind==='shutter'||door.pairedWith)continue;
   const mirrored={...door,swing:door.swing===1?-1:1};
   if(!clearance(first,mirrored))
    assert.equal(clearance(first,door),false,
      'a door with one passable orientation must choose a passable one');
  }
 }
});

test('D3.13C generation and runtime keep the same physically clear front swing',()=>{
 const site=fixture(728413,'house');
 const front=site.doors.find(d=>d.id==='FRONT');
 assert.ok(front);
 assert.equal(front.swing,-1,'generated site corrects the blocked +1 swing');
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,728413,'full-view','small','intel',quiet,
  {enableCivilians:false});
 const physical=session.doors.find(d=>d.id==='FRONT');
 assert.ok(physical);
 assert.equal(physical.swing,front.swing,
  'session initialization must not silently undo generator hinge correction');
 const world={site:session.site,walls:session.site.walls,
  cover:session.coverState,revision:0};
 assert.equal(doorSwingBlocked(physical,.72,[],OPERATOR_RADIUS,world),false,
  'the actual live door can clear the 72% angle against current geometry');
});
