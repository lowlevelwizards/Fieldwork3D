import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TACTICAL_ACTION_MODALITY,assessTacticalAction}
 from '../src/breach-action-assessment.ts';
import {declaredActionTypes} from '../scripts/verification/r6-0-tactical-action-audit.mjs';

const schema=readFileSync(new URL('../src/breach-plan.ts',import.meta.url),'utf8');
const assessmentSource=readFileSync(
 new URL('../src/breach-action-assessment.ts',import.meta.url),'utf8');
const base=(action,overrides={})=>({
 action,phase:'authoring',actorAvailable:true,targetAvailable:true,
 domainEligible:true,observed:true,requireObserved:true,
 distance:42,maximumRange:42,unobstructed:true,...overrides
});

test('R6.1 registry exhaustively classifies current interaction subtypes including window coverings',()=>{
 const {interactions}=declaredActionTypes(schema);
 assert.deepEqual(Object.keys(TACTICAL_ACTION_MODALITY).sort(),interactions.sort());
 const categories=Object.values(TACTICAL_ACTION_MODALITY);
 assert.equal(categories.filter(x=>x==='voice').length,5);
 assert.equal(categories.filter(x=>x==='person-contact').length,4);
 const objectActions=['push','open-window','close-window','break-window',
  'secure-firearm','power-on','power-off','open-covering','close-covering',
  'half-covering','tilt-covering','untilt-covering','lock-covering','unlock-covering'];
 assert.deepEqual(Object.keys(TACTICAL_ACTION_MODALITY)
  .filter(x=>TACTICAL_ACTION_MODALITY[x]==='object-contact').sort(),objectActions.sort());
 for(const action of objectActions)
  assert.equal(assessTacticalAction(base(action)).needsContact,true,action);
 assert.equal(categories.filter(x=>x==='release').length,2);
 assert.equal(TACTICAL_ACTION_MODALITY['break-window'],'object-contact');
 assert.equal(assessTacticalAction(base('break-window')).needsContact,true);
 for(const action of ['follow-civilian','stop-following-civilian',
   'challenge-suspect','escort-suspect','stop-escorting-suspect']){
  assert.equal(TACTICAL_ACTION_MODALITY[action],'voice');
  assert.equal(assessTacticalAction(base(action)).needsContact,false);
 }
 for(const action of ['restrain-civilian','restrain-suspect',
   'secure-civilian','search-suspect'])
  assert.equal(assessTacticalAction(base(action)).needsContact,true);
});
test('R6.1 verdict preserves exact boundary and rejects missing or invalid reach',()=>{
 const allowed=assessTacticalAction(base('restrain-suspect'));
 assert.deepEqual(allowed,{
  allowed:true,modality:'person-contact',needsContact:true,
  phase:'authoring',denial:null
 });
 for(const n of [42.00001,43,Infinity])
  assert.equal(assessTacticalAction(base('restrain-suspect',
    {distance:n})).denial,n===Infinity?'invalid-range':'out-of-range');
 for(const n of [NaN,-1,-Infinity,undefined])
  assert.equal(assessTacticalAction(base('restrain-civilian',
    {maximumRange:n})).denial,'invalid-range');
 assert.equal(assessTacticalAction(base('restrain-civilian',
  {unobstructed:undefined})).denial,'obstructed');
});
test('R6.1 deterministic denial priority and phase do not grant hidden targets',()=>{
 assert.equal(assessTacticalAction(base('challenge-suspect',{
  actorAvailable:false,targetAvailable:false,observed:false,distance:200,
  unobstructed:false})).denial,'actor-unavailable');
 assert.equal(assessTacticalAction(base('challenge-suspect',{
  targetAvailable:false,observed:false})).denial,'target-unavailable');
 assert.equal(assessTacticalAction(base('challenge-suspect',{
  domainEligible:false,observed:false})).denial,'ineligible');
 assert.equal(assessTacticalAction(base('challenge-suspect',{
  observed:false})).denial,'not-observed');
 assert.equal(assessTacticalAction(base('follow-civilian',{
  distance:150,maximumRange:150,observed:false,
  requireObserved:false,phase:'go'})).allowed,true);
 assert.equal(assessTacticalAction(base('follow-civilian',{
  distance:150,maximumRange:150,phase:'selection',observed:false,
  requireObserved:true})).allowed,false);
});
test('R6.1 voice has no physical contact and release no synthetic range requirement',()=>{
 const voice=assessTacticalAction(base('escort-suspect',{
  distance:149,maximumRange:150,phase:'go'}));
 assert.equal(voice.allowed,true);
 assert.equal(voice.needsContact,false);
 assert.equal(assessTacticalAction(base('escort-suspect',{
  distance:149,maximumRange:150,unobstructed:false})).denial,'obstructed');
 for(const action of ['release-civilian','release-capture-target']){
  assert.equal(assessTacticalAction({
   action,phase:'go',actorAvailable:true,targetAvailable:true,domainEligible:true
  }).allowed,true);
  assert.equal(assessTacticalAction({
   action,phase:'go',actorAvailable:true,targetAvailable:false,domainEligible:true
  }).denial,'target-unavailable');
 }
});
test('R6.1 pure evaluator imports no world/clock, and adoption stays in existing owners',()=>{
 assert.match(assessmentSource,/import type \{PlanNode\}/);
 assert.doesNotMatch(assessmentSource,/from ['"](?:three|\.\/breach-(?:game|navigation|actor-motor|world-context|replay)|\.\/ui\/)/);
 assert.doesNotMatch(assessmentSource,/\b(?:Date\.now|performance\.|Math\.random|setInterval\(|setTimeout\(|document\.|window\.)/);
 for(const name of ['breach-game.ts','breach-order-interactions.ts',
   'breach-civilian-context-selection.ts']){
  const source=readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
  assert.match(source,/assessTacticalAction/,name+' must actually adopt R6.1');
 }
});
