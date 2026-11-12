import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldProtectObjective} from '../src/breach-ai-mission-response.ts';
const base={mission:'intel',role:'sentry',distanceToPost:45,
 distanceOfEvidenceToPost:85,heardActionableEvidence:true,
 directSight:false,suppression:.1};
test('R5.3 posted sentry responds to actual relevant disturbance by defending',()=>{
 assert.equal(shouldProtectObjective(base),true);
 assert.equal(shouldProtectObjective({...base,mission:'hold'}),true);
 assert.equal(shouldProtectObjective({...base,mission:'capture',role:'reserve'}),true);
 assert.equal(shouldProtectObjective({...base,mission:'rescue',role:'leader'}),true);
});
test('R5.3 mission semantics never grant knowledge or outrank urgent direct contact',()=>{
 for(const change of [{mission:'clear'},{role:'occupant'},
 {role:'target'},{heardActionableEvidence:false},
 {distanceToPost:180},{distanceOfEvidenceToPost:330},
 {directSight:true},{suppression:.82}]){
  assert.equal(shouldProtectObjective({...base,...change}),false,JSON.stringify(change));
 }
 const code=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(code,/shouldProtectObjective\(\{/);
 assert.match(code,/distanceOfEvidenceToPost:d\(heard,s\.scenario\.objective\)/);
 assert.match(code,/a\.defense=defensivePosition\(a,heard,s\)/);
});
