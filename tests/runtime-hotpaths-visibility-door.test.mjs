import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,liveVisibility,observerPointVisible,team,nearestDoor}
  from '../src/breach-game.ts';
import {activateSite,doorCenter} from '../src/breach-core.ts';

test('allocation-free live visibility matches per-friendly authoritative sight',()=>{
  try{
    for(const seed of [31,224]){
      const s=newSession(0,seed,'floor-plan');
      s.intel.mode='true-blind';
      const squad=team(s);
      assert.ok(squad.length>0);
      // Compare many points around both friendly sight cones and nearby rooms.
      const points=squad.flatMap(actor=>[
        actor.p,
        ...[-1.1,-.5,0,.5,1.1,2.5].flatMap(offset=>
          [20,80,180,239,241].map(radius=>({
            x:actor.p.x+Math.cos(actor.heading+offset)*radius,
            y:actor.p.y+Math.sin(actor.heading+offset)*radius
          })))
      ]);
      for(const p of points){
        const prior=squad.some(actor=>observerPointVisible(s,actor,p));
        assert.equal(liveVisibility(s,p),prior,
          'sight disagreement at '+seed+': '+JSON.stringify(p));
      }
      // Full view is explicitly a separate visibility contract.
      s.intel.mode='full-view';
      assert.equal(liveVisibility(s,{x:-1e5,y:-1e5}),true);
      s.intel.mode='true-blind';
      for(const actor of squad)actor.health=0;
      assert.equal(liveVisibility(s,squad[0].p),false);
    }
  }finally{activateSite(null);}
});
test('nearest-door direct scan matches stable filter/sort, including ties',()=>{
  const s=newSession(0,17,'floor-plan');
  const door=(id,x,y,open=false)=>({
    id,a:{x,y},b:{x:x+20,y},open,openedAt:-1
  });
  try{
    s.doors=[door('far',140,130),door('first',100,100),
      door('second',100,100),door('open',100,100,true)];
    const reference=p=>s.doors.filter(d=>!d.open&&
      Math.hypot(p.x-doorCenter(d).x,p.y-doorCenter(d).y)<35)
      .sort((a,b)=>
        Math.hypot(p.x-doorCenter(a).x,p.y-doorCenter(a).y)-
        Math.hypot(p.x-doorCenter(b).x,p.y-doorCenter(b).y))[0]??null;
    for(const p of [{x:110,y:100},{x:130,y:125},
      {x:150,y:150},{x:140,y:130},{x:10000,y:10000}]){
      assert.equal(nearestDoor(s,p),reference(p));
    }
    assert.equal(nearestDoor(s,{x:110,y:100})?.id,'first',
      'an equal-distance door must retain the first stable match');
  }finally{activateSite(null);}
});
