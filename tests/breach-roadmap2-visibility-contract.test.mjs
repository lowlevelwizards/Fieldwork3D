import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,knownAt,liveVisibility,observerPointVisible} from '../src/breach-game.ts';
import {intelFogLevel} from '../src/breach-intel.ts';
import {groundView,groundViewCandidate} from '../src/breach-ground-view.ts';

test('facing cone is directional and never treats the reverse ray as sight',()=>{
 const sight=groundView(200,200,0);
 assert.equal(groundViewCandidate(sight,220,200),true);
 assert.equal(groundViewCandidate(sight,180,200),false);
 assert.equal(groundViewCandidate(sight,440,200),false);
});
test('full view is a presentation/omniscience override, not personal observer sight',()=>{
 try{
  const s=newSession(0,31,'full-view','small');
  const observer=team(s)[0],back={x:observer.p.x-20,y:observer.p.y};
  observer.heading=0;
  assert.equal(liveVisibility(s,back),true);
  assert.equal(observerPointVisible(s,observer,back),false);
  const point=s.site?.objective??back;
  assert.equal(intelFogLevel(s.intel,s.site,point,false,false),0);
  s.intel.mode='true-blind';
  for(const a of team(s))a.health=0;
  assert.equal(liveVisibility(s,point),false);
  assert.equal(intelFogLevel(s.intel,s.site,point,false,false),2);
 }finally{activateSite(null);}
});
test('briefed floor plan is not equivalent to confirmed actor visibility or ground discovery',()=>{
 try{
  const s=newSession(0,19,'floor-plan','small');
  const p=s.site?.objective??{x:250,y:250};
  s.seenGround.clear();
  assert.equal(intelFogLevel(s.intel,s.site,p,false,false),1);
  assert.equal(knownAt(s,p.x,p.y),false);
  const key=Math.floor(p.x/40)+','+Math.floor(p.y/40);
  s.seenGround.add(key);
  assert.equal(knownAt(s,p.x,p.y),true);
 }finally{activateSite(null);}
});
