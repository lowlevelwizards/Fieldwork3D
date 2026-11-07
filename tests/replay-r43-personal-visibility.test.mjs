import test from 'node:test';
import assert from 'node:assert/strict';
import {personalGroundEvidenceAt,personalDecorVisible,
  personalCoverVisible}
  from '../src/breach-replay-personal-visibility.ts';

test('personal evidence cannot borrow squad ground or imprecise coarse cells',()=>{
  const squadKnows=true,point={x:25,y:35};
  const blank=new Set();
  assert.equal(personalDecorVisible(squadKnows,true,blank,point),false);
  assert.equal(personalDecorVisible(squadKnows,true,new Set(['0,0']),point),false);
  assert.equal(personalDecorVisible(squadKnows,true,new Set(['fine:1,1']),point),true);
  assert.equal(personalDecorVisible(squadKnows,false,blank,point),true);
  assert.equal(personalDecorVisible(false,false,blank,point),false);
});
test('recorded micro and fine evidence each reveal only their exact cell',()=>{
  const observed=new Set(['micro:8,9','fine:-2,3']);
  assert.equal(personalGroundEvidenceAt(observed,{x:85,y:95}),true);
  assert.equal(personalGroundEvidenceAt(observed,{x:79.9,y:95}),false);
  assert.equal(personalGroundEvidenceAt(observed,{x:-39,y:64}),true);
  assert.equal(personalGroundEvidenceAt(observed,{x:-19,y:64}),false);
});
test('missing old-film evidence always fails closed for first-person props',()=>{
  assert.equal(personalGroundEvidenceAt(null,{x:1,y:1}),false);
  assert.equal(personalGroundEvidenceAt(new Set(['fine:0,0']),
    {x:NaN,y:0}),false);
  assert.equal(personalDecorVisible(true,true,null,{x:3,y:3}),false);
});

test('pushed cover uses historical current position, never original known cell',()=>{
  const original={x:25,y:35},moved={x:205,y:215};
  const rememberedOriginal=new Set(['fine:1,1']);
  assert.equal(personalCoverVisible(true,true,rememberedOriginal,moved),false);
  assert.equal(personalCoverVisible(true,true,rememberedOriginal,original),true);
  const discoveredDestination=new Set(['micro:20,21']);
  assert.equal(personalCoverVisible(false,true,discoveredDestination,moved),true);
  assert.equal(personalCoverVisible(true,true,discoveredDestination,null),false);
  // Tactical replay still observes its own team/fog semantics.
  assert.equal(personalCoverVisible(true,false,null,null),true);
  assert.equal(personalCoverVisible(false,false,discoveredDestination,moved),false);
});
