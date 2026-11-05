import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianResponse} from '../src/breach-civilian-response.ts';
const person=()=>createCivilian({id:'civ:work',role:'employee',persona:'steady',
 activity:'working',position:{x:40,y:40},heading:0,
 roomId:'shop',appearanceSeed:6});
const guard={id:'guard',p:{x:82,y:40},heading:Math.PI,
 health:4,velocity:0,posture:'stand',side:'red',lastShotAt:-100};
const world={noise:[],doors:[],walls:[],windows:[],people:[guard],
 canSee:()=>true,canReach:()=>true};
test('E5-C2a an idle site guard is not magically a threat',()=>{
 const c=person();
 stepCivilianResponse(c,.25,.25,world);
 assert.equal(c.fear,0);assert.equal(c.state,'routine');
});
test('E5-C2a actual witnessed hostile shooting causes a visual alarm',()=>{
 const c=person();
 stepCivilianResponse(c,.25,.25,{...world,
  people:[{...guard,lastShotAt:.20}]});
 assert.equal(c.state,'startled');assert.ok(c.fear>.70);
});
test('E5-C2a unseen gunfire does not grant omniscient visual knowledge',()=>{
 const c=person();
 stepCivilianResponse(c,.25,.25,{...world,
  canSee:()=>false,people:[{...guard,lastShotAt:.20}]});
 assert.equal(c.fear,0);assert.equal(c.threatEstimate,null);
});
