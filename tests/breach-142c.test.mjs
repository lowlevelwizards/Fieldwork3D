import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
import {newSession,team,enemies,stepSession,toggling} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('142C: archetype and corridor seeds preserve playable site access',()=>{
  for(let seed=1;seed<=96;seed++){
    const result=auditGeneratedSite(seed);
    assert.deepEqual(result.errors,[],
      'seed '+seed+': '+result.errors.join('; '));
  }
  activateSite(null);
});
test('142C: short seeded firefights remain finite and stable',()=>{
  for(const seed of [3,5,11,15,23,30,42,61,76,91]){
    const session=newSession(0,seed);
    toggling(session);
    for(let frame=0;frame<48;frame++){
      stepSession(session,1/60);
      for(const a of [...team(session),...enemies(session)]){
        assert.ok(Number.isFinite(a.p.x)&&Number.isFinite(a.p.y),
          'non-finite movement seed '+seed);
        assert.ok(Number.isFinite(a.heading));
        assert.ok(Number.isFinite(a.velocity));
      }
    }
    assert.ok(session.seconds>0);
  }
  activateSite(null);
});
