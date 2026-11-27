import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export function validateReleaseCandidate({pull,main,comparison,runs,expectedHead}){
 assert.equal(pull.state,'open','PR must be open');
 assert.equal(pull.draft,false,'Draft PR is not a release candidate');
 assert.equal(pull.base.ref,'main','Release must target main');
 assert.equal(pull.head.sha,expectedHead,'PR head changed; reconcile and retest');
 assert.equal(pull.base.sha,main,'Main changed; refresh the candidate');
 assert.equal(comparison.behind_by,0,'Reconcile the branch with current main');
 assert.ok(comparison.ahead_by>0,'No release changes');
 assert.equal(pull.mergeable,true,'PR is not confirmed mergeable');
 const newest=new Map();
 for(const run of runs){
  if(run.event!=='pull_request'||run.head_sha!==expectedHead||run.head_branch!==pull.head.ref)continue;
  const key=run.workflow_id;
  const old=newest.get(key);
  if(!old||run.run_number>old.run_number||(run.run_number===old.run_number&&run.run_attempt>old.run_attempt))newest.set(key,run);
 }
 const checks=[...newest.values()];
 assert.ok(checks.some(run=>run.path==='.github/workflows/ci.yml'&&run.conclusion==='success'&&run.status==='completed'),'Missing successful primary CI for this head');
 for(const run of checks)assert.ok(run.status==='completed'&&['success','skipped','neutral'].includes(run.conclusion),run.name+' is '+run.status+'/'+run.conclusion);
 return {main,head:expectedHead,pr:pull.number,validatedRuns:checks.length};
}
async function main(){
 const {GITHUB_REPOSITORY:repo,GITHUB_TOKEN:token,RELEASE_PR:number,RELEASE_HEAD:expectedHead}=process.env;
 assert.match(number||'',/^[1-9][0-9]*$/);
 assert.match(expectedHead||'',/^[a-f0-9]{40}$/);
 assert.ok(repo&&token,'GitHub repository and token required');
 const api=async path=>{
  const response=await fetch('https://api.github.com/repos/'+repo+'/'+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('GitHub API '+response.status+' '+path);
  return response.json();
 };
 const pull=await api('pulls/'+number),main=(await api('branches/main')).commit.sha;
 assert.equal(pull.head.repo?.full_name?.toLowerCase(),repo.toLowerCase(),'Only same-repository releases are supported');
 const comparison=await api('compare/'+main+'...'+expectedHead);
 const runs=[];
 for(let page=1;page<=100;page++){
  const response=await api('actions/runs?event=pull_request&head_sha='+expectedHead+'&per_page=100&page='+page);
  runs.push(...response.workflow_runs);
  if(response.workflow_runs.length<100)break;
  if(page===100)throw Error('Workflow run pagination limit reached');
 }
 const result=validateReleaseCandidate({pull,main,comparison,runs,expectedHead});
 assert.equal((await api('branches/main')).commit.sha,main,'Main advanced during preflight');
 assert.equal((await api('pulls/'+number)).head.sha,expectedHead,'PR changed during preflight');
 console.log('RELEASE CANDIDATE PASS (read-only): '+JSON.stringify(result));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();
