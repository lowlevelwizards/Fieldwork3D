import test from 'node:test';
import assert from 'node:assert/strict';
import {visualGain,advanceSight,detectedSight,confirmedSight}
 from '../src/breach-visual-perception.ts';
import {applyReplayKnowledge,replayActorDisclosed,
 recordedObserverCanDetect,recordedObserverCanSee}
 from '../src/breach-replay-visibility.ts';

test('V2 distant target can be detected but still requires time for positive ID',()=>{
 assert.ok(visualGain(1100,0,false,false)>0);
 assert.ok(visualGain(200,0,false,false)>visualGain(1100,0,false,false));
 assert.equal(visualGain(100,1.5,false,false),0);
 let progress=0,detectedTick=-1,identifiedTick=-1;
 for(let i=0;i<300;i++){
  progress=advanceSight(progress,1/60,visualGain(850,.2,false,false),true);
  if(detectedTick<0&&detectedSight(progress))detectedTick=i;
  if(identifiedTick<0&&confirmedSight(progress))identifiedTick=i;
 }
 assert.ok(detectedTick>=0&&identifiedTick>detectedTick+20);
 assert.equal(advanceSight(1,1/60,1,false),0,
  'losing physical sight clears identification rather than retaining an unseen target');
});

test('V2 personal replay discloses a recorded glimpse but never upgrades it to ID',()=>{
 const session={};
 const actor={id:'hidden',side:'red',health:3};
 const sample={
  visibleActorIds:['hidden'],visibleCivilianIds:[],discoveredBodyIds:[],
  operatorDetectedActorIds:{rook:['hidden'],ash:[]},
  operatorVisibleActorIds:{rook:[],ash:[]}
 };
 applyReplayKnowledge(session,sample);
 assert.equal(recordedObserverCanDetect(sample,'rook','hidden'),true);
 assert.equal(recordedObserverCanSee(sample,'rook','hidden'),false);
 assert.equal(replayActorDisclosed(session,actor,
   {mode:'operator',observerId:'rook'}),true);
 assert.equal(replayActorDisclosed(session,actor,
   {mode:'operator',observerId:'ash'}),false);
 assert.equal(replayActorDisclosed(session,actor,
   {mode:'operator',observerId:'missing'}),false);
 assert.equal(replayActorDisclosed(session,actor,{mode:'squad'}),true);
 const legacy={...sample,operatorDetectedActorIds:undefined};
 assert.equal(recordedObserverCanDetect(legacy,'rook','hidden'),false,
  'old film may preserve ID but never reconstruct a new silhouette');
 assert.equal(recordedObserverCanDetect(null,'rook','hidden'),null);
});
