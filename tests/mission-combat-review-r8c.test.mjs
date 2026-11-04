import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCombatReview,summarizeCombatReview}
 from '../src/breach-combat-review.ts';
const shot=(id,hit=false,mode='ads')=>({id,hit,mode,surface:hit?'blood':'metal'});
const actor=(suppression)=>({id:'rook',health:4,suppression});
test('R8C: replay shot identities dedupe across repeated frames',()=>{
 const frames=[{shots:[shot(1)],actors:[actor(.1)]},
  {shots:[shot(1),shot(2,true,'point')],actors:[actor(.7)]}];
 const events=[{t:2,kind:'intel',text:'ROOK SPOTTED HOSTILE'},
  {t:2.9,kind:'shot',text:'ROOK FIRED'},{t:3,kind:'wound',text:'GUARD INJURED'}];
 const out=summarizeCombatReview(frames,events);
 assert.equal(out.observedProjectiles,2);
 assert.equal(out.verifiedHits,1);
 assert.equal(out.woundEvents,1);
 assert.equal(out.hitRate,50);
 assert.equal(out.peakSuppression,.7);
 assert.equal(out.contactToFireSeconds,.9);
 assert.match(formatCombatReview(frames,events),/OBSERVED PROJECTILES 2/);
});
test('R8C: no contact or shot leaves readable zero/unknown outcome',()=>{
 const result=summarizeCombatReview([{shots:[],actors:[actor(0)]}],[]);
 assert.equal(result.observedProjectiles,0);
 assert.equal(result.contactToFireSeconds,null);
 assert.match(formatCombatReview([],[]),/NO CONFIRMED CONTACT/);
});

test('G3: hostile fire before observation is not a zero-second contact response',()=>{
 const frames=[{shots:[shot(9)],actors:[actor(.3)]}];
 const events=[
  {id:1,t:1,kind:'shot',text:'GUARD FIRED'},
  {id:2,t:3,kind:'intel',text:'ROOK SPOTTED GUARD'},
  {id:3,t:5.1,kind:'shot',text:'ROOK FIRED'}
 ];
 const r=summarizeCombatReview(frames,events);
 assert.equal(r.preContactShots,1);
 assert.equal(r.contactToFireSeconds,2.1);
 assert.match(formatCombatReview(frames,events),/PRE-CONTACT GUNFIRE 1/);
 assert.match(formatCombatReview(frames,events),/2\.1s CONTACT→NEXT SHOT/);
});
test('G3: only pre-contact shots yield unknown response, never false zero',()=>{
 const events=[
  {id:1,t:1,kind:'shot',text:'GUARD FIRED'},
  {id:2,t:3,kind:'intel',text:'ROOK SPOTTED GUARD'}
 ];
 const r=summarizeCombatReview([],events);
 assert.equal(r.preContactShots,1);
 assert.equal(r.contactToFireSeconds,null);
 assert.match(formatCombatReview([],events),/NO RECORDED POST-CONTACT SHOT/);
});
test('G3: simultaneous observed shot legitimately has zero response delay',()=>{
 const events=[{id:1,t:4,kind:'intel',text:'ROOK SPOTTED GUARD'},
   {id:2,t:4,kind:'shot',text:'ROOK FIRED'}];
 const r=summarizeCombatReview([],events);
 assert.equal(r.contactToFireSeconds,0);
 assert.equal(r.preContactShots,0);
});

test('G3: no contact in an active firefight never claims a post-contact response',()=>{
 const events=[{id:1,t:2,kind:'shot',text:'GUARD FIRED'}];
 const r=summarizeCombatReview([],events);
 assert.equal(r.contactToFireSeconds,null);
 assert.equal(r.preContactShots,0);
 assert.match(formatCombatReview([],events),/NO CONFIRMED CONTACT/);
});
