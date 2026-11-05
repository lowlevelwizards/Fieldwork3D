import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianResponse}
 from '../src/breach-civilian-response.ts';
const make=()=>createCivilian({
 id:'civ:7:0',role:'employee',persona:'cautious',activity:'working',
 position:{x:70,y:70},heading:0,roomId:'store',
 routine:[{x:70,y:70},{x:30,y:70}],appearanceSeed:8
});
const env={
 noise:[],people:[],doors:[],walls:[],windows:[],
 canSee:()=>true,canReach:()=>true
};
test('E5-B4: faint out-of-range sounds never cause global panic',()=>{
 const c=make();
 stepCivilianResponse(c,.2,.2,{...env,noise:[{
 id:1,p:{x:950,y:950},radius:30,time:.01,kind:'gunshot'}]});
 assert.equal(c.state,'routine');assert.equal(c.fear,0);
});
test('E5-B4: physically heard gunshot startles only observer, dedupes id',()=>{
 const c=make(),sound={id:2,p:{x:95,y:70},radius:250,
 time:.1,kind:'gunshot'};
 stepCivilianResponse(c,.2,.2,{...env,noise:[sound]});
 assert.equal(c.state,'startled');
 const fear=c.fear,known=c.threatEstimate;
 stepCivilianResponse(c,.4,.2,{...env,noise:[sound]});
 assert.equal(c.fear,fear);
 assert.deepEqual(c.threatEstimate,known);
 stepCivilianResponse(c,1,.6,{...env,noise:[sound]});
 assert.equal(c.state,'fleeing');
 assert.ok(c.goal.x<70);
});
test('E5-B4: blocked escape freezes without teleporting',()=>{
 const c=make(),world={...env,canReach:()=>false,
 noise:[{id:3,p:{x:90,y:70},radius:300,time:.1,kind:'kick'}]};
 stepCivilianResponse(c,.2,.2,world);
 stepCivilianResponse(c,1, .8,world);
 assert.equal(c.state,'frozen');
 assert.deepEqual(c.p,{x:70,y:70});
});
test('E5-B4: visual alarm requires line-of-sight and angular acquisition',()=>{
 const actor={id:'rook',p:{x:100,y:70},heading:0,
 health:4,velocity:0,posture:'stand',side:'blue'};
 const hidden=make();
 stepCivilianResponse(hidden,.25,.25,{...env,people:[actor],canSee:()=>false});
 assert.equal(hidden.fear,0);
 const seen=make();
 stepCivilianResponse(seen,.25,.25,{...env,people:[actor]});
 assert.ok(seen.fear>.70);
 assert.equal(seen.state,'startled');
 const behind=make();
 const rear={...actor,p:{x:35,y:70}};
 stepCivilianResponse(behind,.25,.25,{...env,people:[rear]});
 assert.equal(behind.fear,0);
});
