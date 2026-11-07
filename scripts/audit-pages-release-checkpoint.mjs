/** GitHub-hosted production release checkpoint. Never merges or deploys.
 * Run from a trusted PR check with GITHUB_TOKEN (actions:read). Query the
 * authoritative main Pages queue, then the LIVE served build identifier.
 * This intentionally fails closed: a queued Pages run, failed deployment,
 * mismatched head, stale build or unreachable public site blocks release.
 */
const repo=process.env.GITHUB_REPOSITORY||'lowlevelwizards/Fieldwork3D';
const token=process.env.GITHUB_TOKEN||'';
const timeout=12000;
const headers={
 'Accept':'application/vnd.github+json',
 'User-Agent':'fieldwork3d-release-preflight',
 ...(token?{'Authorization':'Bearer '+token}:{})
};
async function readJson(url,opts={}){
 const response=await fetch(url,{...opts,signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Error('HTTP '+response.status+' from '+url+
  ': '+(await response.text()).slice(0,240));
 return response.json();
}
const api=path=>readJson('https://api.github.com/repos/'+repo+'/'+path,
 {headers});
const main=await api('branches/main');
const mainSha=main.commit.sha;
const workflows=await api('actions/workflows/pages.yml/runs?branch=main&per_page=30');
const runs=(workflows.workflow_runs??[]).filter(run=>
 run.head_branch==='main'&&
 (run.event==='push'||run.event==='workflow_dispatch'));
if(!runs.length)throw Error('No production Pages workflow run for main');
const pending=runs.filter(run=>run.status!=='completed');
const latest=runs[0];
console.log('Release preflight:',JSON.stringify({
 main:mainSha,pending:pending.map(run=>({
  id:run.id,status:run.status,url:run.html_url})),
 latest:{id:latest.id,sha:latest.head_sha,status:latest.status,
  conclusion:latest.conclusion,url:latest.html_url}
},null,2));
if(pending.length)throw Error('Pages publish already queued/in progress; do not merge another release');
if(latest.status!=='completed'||latest.conclusion!=='success')
 throw Error('Last Pages workflow not successful: '+latest.html_url);
if(latest.head_sha!==mainSha)
 throw Error('Last successful Pages workflow does not match current main HEAD');
const endpoint='https://lowlevelwizards.github.io/Fieldwork3D/fieldwork-build.json';
const served=await readJson(endpoint+'?release-preflight='+Date.now(),{
 headers:{'Cache-Control':'no-cache'}});
const expected=mainSha.slice(0,12)+'-';
if(typeof served.id!=='string'||!served.id.startsWith(expected))
 throw Error('Pages served stale/unexpected build: '+String(served.id)+
  '; expected prefix '+expected);
console.log('PAGES RELEASE PREFLIGHT PASS: main '+mainSha+
 '; live id '+served.id+'; verified workflow '+latest.id);
