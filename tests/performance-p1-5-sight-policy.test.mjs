import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationSightPolicy,allowPresentationSightReuse}
 from '../src/rendering/breach-presentation-sight-policy.ts';
test('P1.5a policy controls live execution but never historical replay',()=>{
 assert.equal(presentationSightPolicy(null),'always');
 assert.equal(presentationSightPolicy('always'),'always');
 assert.equal(presentationSightPolicy('planning'),'planning');
 assert.equal(presentationSightPolicy('legacy'),'legacy');
 for(const mode of ['always','planning','legacy']){
  assert.equal(allowPresentationSightReuse(mode,'planning',true),false);
  assert.equal(allowPresentationSightReuse(mode,'running',true),false);
 }
 assert.equal(allowPresentationSightReuse('always','running',false),true);
 assert.equal(allowPresentationSightReuse('planning','planning',false),true);
 assert.equal(allowPresentationSightReuse('planning','running',false),false);
 assert.equal(allowPresentationSightReuse('legacy','planning',false),false);
});
