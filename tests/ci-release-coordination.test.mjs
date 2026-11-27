import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReleaseCandidate} from '../scripts/verification/ci-release-coordination.mjs';
const good={main:'base',expectedHead:'head',comparison:{behind_by:0,ahead_by:1},pull:{number:1,state:'open',draft:false,base:{ref:'main',sha:'base'},head:{sha:'head',ref:'art/pack'},mergeable:true},runs:[{name:'CI',workflow_id:1,path:'.github/workflows/ci.yml',event:'pull_request',head_sha:'head',head_branch:'art/pack',run_number:2,run_attempt:1,status:'completed',conclusion:'success'}]};
test('release gate accepts exact head with successful latest CI',()=>assert.equal(validateReleaseCandidate(good).validatedRuns,1));
test('release gate refuses stale heads, drafts, conflicts, missing or active checks',()=>{
 for(const bad of [
  {...good,expectedHead:'other'},
  {...good,main:'other'},
  {...good,comparison:{behind_by:1,ahead_by:2}},
  {...good,pull:{...good.pull,draft:true}},
  {...good,pull:{...good.pull,mergeable:false}},
  {...good,runs:[]},
  {...good,runs:[...good.runs,{...good.runs[0],workflow_id:2,name:'Visual',status:'queued',conclusion:null}]},
  {...good,runs:[...good.runs,{...good.runs[0],run_number:3,status:'completed',conclusion:'failure'}]}
 ])assert.throws(()=>validateReleaseCandidate(bad));
});
test('superseded workflow attempts do not block newer successful attempt',()=>{
 assert.equal(validateReleaseCandidate({...good,runs:[{...good.runs[0],run_number:1,conclusion:'failure'},...good.runs]}).validatedRuns,1);
});
