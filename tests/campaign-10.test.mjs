import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign} from '../src/campaign-state.ts';
import {exportCampaign,importCampaign} from '../src/campaign-persistence.ts';
test('campaign export round trips and invalid imports are rejected',()=>{
 const c=newCampaign(817);
 assert.deepEqual(importCampaign(exportCampaign(c)),c);
 assert.equal(importCampaign('unparseable'),null);
 assert.equal(importCampaign('{"version":2}'),null);
 assert.equal(importCampaign('x'.repeat(2_000_001)),null);
});
