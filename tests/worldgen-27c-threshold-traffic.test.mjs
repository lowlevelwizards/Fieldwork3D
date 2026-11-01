import test from 'node:test';
import assert from 'node:assert/strict';
import {planThresholdTrafficWear,THRESHOLD_WEAR_LIMIT}
 from '../src/worldgen/threshold-traffic-wear.ts';

const room={id:'R',kind:'room',purpose:'hallway',x:0,y:0,w:200,h:200};
const door={id:'FRONT',a:{x:76,y:0},b:{x:124,y:0}};
const site=(conditionLevel)=>({
 seed:77,archetype:'house',condition:'neglected',conditionLevel,
 rooms:[room],doors:[door],cover:[],
});
test('actual doorway traffic increases with condition, clean rooms stay clean',()=>{
 const clean=planThresholdTrafficWear(site(0));
 const mid=planThresholdTrafficWear(site(50));
 const ruined=planThresholdTrafficWear(site(100));
 assert.equal(clean.length,0);
 assert.ok(mid.length>0);
 assert.ok(ruined.length>=mid.length);
 assert.ok(ruined.length<=THRESHOLD_WEAR_LIMIT);
 const mark=ruined[0];
 assert.equal(mark.roomId,'R');
 assert.ok(mark.x>=0&&mark.x<=room.w&&mark.y>=0&&mark.y<=room.h);
 assert.ok(mark.y<40,'threshold marks must be near the actual entrance');
 assert.deepEqual(ruined,planThresholdTrafficWear(site(100)));
});
test('only physical door approaches in actual rooms produce marks',()=>{
 const noDoor={...site(100),doors:[]};
 assert.deepEqual(planThresholdTrafficWear(noDoor),[]);
 const detached={...site(100),doors:[{...door,a:{x:400,y:400},b:{x:448,y:400}}]};
 assert.deepEqual(planThresholdTrafficWear(detached),[]);
});
test('large buildings keep a strict global traffic decal budget',()=>{
 const doors=Array.from({length:300},(_,i)=>({
  id:'DOOR-'+i,a:{x:76,y:0},b:{x:124,y:0}
 }));
 const full={...site(100),doors};
 const marks=planThresholdTrafficWear(full);
 assert.equal(marks.length,THRESHOLD_WEAR_LIMIT);
 assert.ok(marks.every(m=>Number.isFinite(m.rotation)&&m.opacity<=.48));
});
