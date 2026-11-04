import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCombatReview,summarizeCombatReview}
 from '../src/breach-combat-review.ts';
const shot=(id,hit=false,mode='aimed')=>({id,hit,mode,surface:hit?'blood':'metal'});
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
