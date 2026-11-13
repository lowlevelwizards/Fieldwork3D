import test from 'node:test';
import assert from 'node:assert/strict';
import {outwardSwingStagingDepth,leafSweepNeedsStaging}
 from '../src/breach-door-swing-staging.ts';
import {coordinatePassage} from '../src/breach-passage-coordinator.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
const p=(x,y)=>({x,y});
test('Q4 outward leaf gets bounded conservative follower staging; inward none',()=>{
 const out=doorRangeSite('outward-left').doors[0];
 const inside=doorRangeSite('inward-left').doors[0];
 assert.ok(outwardSwingStagingDepth(out,-1)>50);
 assert.equal(outwardSwingStagingDepth(inside,-1),0);
 assert.equal(outwardSwingStagingDepth(out,1),0);
});
test('Q4 leaf staging only while actively opening; never force reverse motion',()=>{
 const door={id:'ENTRY',a:p(80,100),b:p(120,100),kind:'hinged',
  hinge:'a',swing:1,open:true,openFraction:.35,
  angularVelocity:1.5};
 const actor=(id,y)=>({id,side:'blue',health:4,p:p(100,y),
  blockedTime:0,passageWaitSeconds:0,motorPause:null,
  plan:[{id:1,kind:'move',p:p(100,250)}]});
 const lead=actor('lead',83),follow=actor('follow',57);
 const s={operators:[lead,follow],doors:[door],seconds:0,events:[]};
 const slots=new Map([
  ['lead',[{actorId:'lead',doorId:'ENTRY',fromSide:-1,rank:0,eta:1}]],
  ['follow',[{actorId:'follow',doorId:'ENTRY',fromSide:-1,rank:1,eta:2}]]
 ]);
 assert.equal(leafSweepNeedsStaging(door),true);
 const hold=coordinatePassage(s,follow,p(100,60),slots);
 assert.equal(hold.hold,true);
 assert.deepEqual(hold.move,follow.p);
 door.openFraction=.95;
 assert.equal(leafSweepNeedsStaging(door),false);
 const release=coordinatePassage(s,follow,p(100,60),slots);
 assert.equal(release.hold,false);
 assert.ok(release.move.y>follow.p.y,
  'no artificially timed pause after the sweep clears');
});
test('Q4 closed/blocked leaf gets no invented movement shortcut',()=>{
 const door={id:'ENTRY',a:p(80,100),b:p(120,100),kind:'hinged',
  hinge:'a',swing:1,open:false,openFraction:0,angularVelocity:0};
 assert.equal(leafSweepNeedsStaging(door),false);
 door.open=true;door.wedged=true;
 assert.equal(leafSweepNeedsStaging(door),false);
});
