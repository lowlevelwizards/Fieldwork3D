import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,liveVisibility,team} from '../src/breach-game.ts';
import {activateSite,doorCenter} from '../src/breach-core.ts';
import {PresentationSightMemo} from '../src/rendering/breach-presentation-sight-memo.ts';

test('P1.1 stationary frame reuses authoritative true and false outcomes',()=>{
 const s=newSession(0,23,'true-blind');
 try{
  const memo=new PresentationSightMemo(),p={x:-1000,y:-1000};
  memo.begin(s);const expected=liveVisibility(s,p);
  assert.equal(memo.query(s,'decor','outside',p),expected);
  for(let i=0;i<100;i++){
   memo.begin(s);
   assert.equal(memo.query(s,'decor','outside',p),expected);
  }
  const stats=memo.stats();
  assert.equal(stats.misses,1);assert.equal(stats.hits,100);
  assert.equal(stats.entries,1);
 }finally{activateSite(null);}
});
test('P1.1 moving/turning/crouching/downing an observer invalidates sight',()=>{
 const s=newSession(0,25,'true-blind');
 try{
  const memo=new PresentationSightMemo(),o=team(s)[0];
  const p={x:o.p.x+80*Math.cos(o.heading),y:o.p.y+80*Math.sin(o.heading)};
  memo.begin(s);memo.query(s,'decor','room',p);
  const changes=[
   ()=>{o.p.x+=1;},()=>{o.heading+=.21;},
   ()=>{o.posture='crouch';},()=>{o.health=0;}
  ];
  for(const change of changes){
   change();memo.begin(s);
   assert.equal(memo.query(s,'decor','room',p),liveVisibility(s,p));
  }
  assert.equal(memo.stats().misses,changes.length+1);
 }finally{activateSite(null);}
});
test('P1.1 door and mutable cover optical changes invalidate within the same tick',()=>{
 const s=newSession(0,31,'true-blind');
 try{
  const memo=new PresentationSightMemo();
  const p=doorCenter(s.doors[0]);
  memo.begin(s);memo.query(s,'door',s.doors[0].id,p);
  s.doors[0].openFraction=.59;
  memo.begin(s);assert.equal(memo.query(s,'door',s.doors[0].id,p),liveVisibility(s,p));
  s.doors[0].style='glazed';
  memo.begin(s);memo.query(s,'door',s.doors[0].id,p);
  s.coverState[0].x+=1;
  memo.begin(s);memo.query(s,'door',s.doors[0].id,p);
  s.coverState[0].low=!s.coverState[0].low;
  memo.begin(s);memo.query(s,'door',s.doors[0].id,p);
  assert.equal(memo.stats().misses,5);
 }finally{activateSite(null);}
});
test('P1.1 replay/legacy bypass and site/session reset fail back to source',()=>{
 const a=newSession(0,40,'true-blind'),b=newSession(0,41,'true-blind');
 try{
  const memo=new PresentationSightMemo(),p={x:999,y:999};
  memo.begin(a);memo.query(a,'decor','test',p);
  memo.begin(a,false);
  for(let i=0;i<3;i++)memo.query(a,'decor','test',p);
  assert.equal(memo.stats().bypasses,3);
  memo.begin(b);assert.equal(memo.query(b,'decor','test',p),liveVisibility(b,p));
  memo.reset();assert.equal(memo.stats().entries,0);
  assert.equal(memo.stats().hits,0);
 }finally{activateSite(null);}
});
