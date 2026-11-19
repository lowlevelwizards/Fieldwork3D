import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPhysicalityAt}
 from '../src/breach-encounter-physicality.ts';
const p=(x,y)=>({x,y});
const subject=()=>createCivilian({
 id:'civ:physicality',role:'visitor',persona:'steady',
 activity:'idle',position:p(100,100),heading:0,
 roomId:'R1',appearanceSeed:83
});
test('EQA3.16A never creates gaze or flinch from hidden knowledge',()=>{
 const c=subject(),before=JSON.stringify(c);
 assert.equal(civilianPhysicalityAt(c,3).headYaw,0);
 assert.equal(civilianPhysicalityAt(c,3).flinch,0);
 c.threatEstimate=p(100,200);
 assert.equal(civilianPhysicalityAt(c,3).headYaw,0,
  'a hidden point without PERSONAL evidence is not rendered');
 c.lastEvidenceAt=2.9;c.lastEvidenceId='audio/18';
 const estimated=civilianPhysicalityAt(c,3.2);
 assert.ok(estimated.headYaw>.01&&estimated.headYaw<=.22,
  'audio-driven attention is approximate and bounded');
 c.lastEvidenceId='visual/rook/alarm/100';
 const sighted=civilianPhysicalityAt(c,3.2);
 assert.ok(sighted.headYaw>estimated.headYaw);
 assert.ok(sighted.headYaw<=.36,'no impossible head swivels');
 assert.equal(civilianPhysicalityAt(c,12).headYaw,0,'stale evidence fades');
 assert.equal(JSON.stringify(c).includes('headYaw'),false,
  'presentation cannot write a gameplay property into the civilian');
 assert.notEqual(JSON.stringify(c),before,
  'only this test changed sensory evidence explicitly');
});
test('EQA3.16A directional gaze and state blends reconstruct after reverse seek',()=>{
 const c=subject();c.state='hiding';c.stateSince=3;
 c.lastEvidenceAt=2.9;c.threatEstimate=p(100,200);
 const before=civilianPhysicalityAt(c,3.01);
 const later=civilianPhysicalityAt(c,3.8);
 assert.ok(later.shelter>before.shelter);
 assert.equal(later.hands,'head');
 assert.deepEqual(civilianPhysicalityAt(c,3.01),before);
 c.state='frozen';
 const frozen=civilianPhysicalityAt(c,3.8);
 assert.ok(frozen.shelter<later.shelter,
  'frozen crouch is less settled than deliberate hiding');
 c.state='compliant';c.stateSince=4;c.restrained=false;
 const contact=civilianPhysicalityAt(c,4.05);
 assert.equal(contact.hands,'up');
 assert.equal(contact.kneel,0);
 assert.ok(civilianPhysicalityAt(c,5.4).kneel>.99);
 c.restrained=true;
 const tied=civilianPhysicalityAt(c,5.4);
 assert.equal(tied.hands,'behind');
 assert.equal(tied.headYaw,0);
});
test('EQA3.16A flinch is finite, reversible, and suppressed for secured/down actors',()=>{
 const c=subject();c.state='startled';c.stateSince=2;
 c.lastFlinchAt=2;
 assert.ok(civilianPhysicalityAt(c,2.15).flinch>.2);
 assert.equal(civilianPhysicalityAt(c,1.9).flinch,0);
 assert.equal(civilianPhysicalityAt(c,2.6).flinch,0);
 assert.ok(civilianPhysicalityAt(c,2.15).flinch>.2);
 c.state='compliant';
 assert.equal(civilianPhysicalityAt(c,2.15).flinch,0);
 c.state='incapacitated';c.health=0;
 const down=civilianPhysicalityAt(c,2.15);
 assert.equal(down.flinch,0);assert.equal(down.hands,'none');
});
