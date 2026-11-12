import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {missionObjectiveResponse,shouldProtectObjective} from '../src/breach-ai-mission-response.ts';
const base={role:'sentry',distanceToPost:100,distanceOfEvidenceToPost:150,
 heardActionableEvidence:true,directSight:false,suppression:.12};
test('R6.1 identical audible danger produces mission-specific reactions',()=>{
 assert.equal(missionObjectiveResponse({...base,mission:'clear'}),'investigate');
 assert.equal(missionObjectiveResponse({...base,mission:'hold'}),'hold-post');
 assert.equal(missionObjectiveResponse({...base,mission:'intel'}),'hold-post');
 assert.equal(missionObjectiveResponse({...base,mission:'rescue'}),'observe-approach');
 assert.equal(missionObjectiveResponse({...base,mission:'capture'}),'observe-approach');
});
test('R6.1 no post defense without actual evidence and role eligibility',()=>{
 for(const change of [{heardActionableEvidence:false},{directSight:true},
  {suppression:.80},{role:'occupant'},{distanceToPost:300},
  {distanceOfEvidenceToPost:600}]){
  assert.equal(missionObjectiveResponse({...base,mission:'hold',...change}),
    'investigate',JSON.stringify(change));
 }
 assert.equal(missionObjectiveResponse({...base,mission:'intel',distanceToPost:155}),
  'investigate');
 assert.equal(missionObjectiveResponse({...base,mission:'hold',distanceToPost:155}),
  'hold-post');
 assert.equal(shouldProtectObjective({...base,mission:'hold'}),true);
});
test('R6.1 existing runtime applies cover or observation through real motor',()=>{
 const src=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(src,/missionObjectiveResponse\(\{/);
 assert.match(src,/objectiveResponse==='hold-post'/);
 assert.match(src,/objectiveResponse==='observe-approach'/);
 assert.match(src,/a\.defense=defensivePosition\(a,heard,s\)/);
});
