/** Classify every checked-in GitHub Actions workflow, without changing triggers.
 * --check protects primary CI, reusable browser/architecture gates, and Pages.
 * --json PATH and --markdown PATH export a complete migration inventory.
 */
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const directory=fileURLToPath(new URL('../../.github/workflows/',import.meta.url));

export function inspectWorkflow(filename,source){
 const lines=source.split(/\r?\n/);
 const start=lines.findIndex(line=>/^on:\s*(?:#.*)?$/.test(line)||/^on:\s*\[/.test(line));
 const triggers=new Map();
 if(start>=0){
  const inline=lines[start].match(/^on:\s*\[([^\]]+)\]/);
  if(inline)for(const name of inline[1].split(',').map(s=>s.trim()).filter(Boolean))
   triggers.set(name,[]);
  else{
   let active=null;
   for(const line of lines.slice(start+1)){
    if(/^\S/.test(line)&&!/^\s*#/.test(line))break;
    const event=line.match(/^  ([\w-]+):(?:\s.*)?$/);
    if(event){
     active=event[1];
     triggers.set(active,[]);
    }else if(active)triggers.get(active).push(line);
   }
  }
 }
 const events=[...triggers.keys()];
 const details=Object.fromEntries([...triggers].map(([event,block])=>{
  const body=block.join('\n');
  const branchInline=body.match(/^\s+branches:\s*\[([^\]]+)\]/m);
  const branchList=branchInline?branchInline[1].split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')):[];
  return [event,{pathsFiltered:/^\s+paths:\s*$/m.test(body),
   branches:branchList,hasBranchFilter:/^\s+branches:\s*/m.test(body)}];
 }));
 const isPr=events.includes('pull_request')||events.includes('pull_request_target');
 const isPush=events.includes('push');
 const isManual=events.includes('workflow_dispatch');
 const isReusable=events.includes('workflow_call');
 const prBranches=details.pull_request?.branches||[];
 const pushBranches=details.push?.branches||[];
 let classification;
 if(filename==='pages.yml')classification='production-release';
 else if(filename==='ci.yml')classification='primary-ci';
 else if(isReusable)classification='reusable-specialist';
 else if(isPr)classification='pr-specialist';
 else if(isPush&&pushBranches.some(name=>name.startsWith('feature/')||name.startsWith('refactor/')))
  classification='historical-branch-push';
 else if(isPush)classification='push-specialist';
 else if(events.length===1&&isManual)classification='manual-only';
 else if(isManual)classification='other-manual';
 else classification='other';
 return {filename,classification,triggers:events,prPathFiltered:
  !!(details.pull_request?.pathsFiltered||details.pull_request_target?.pathsFiltered),
  prBranches,pushBranches,headRefCondition:/github\.head_ref/.test(source),
  manual:isManual,reusable:isReusable,pr:isPr,
  hasBrowserCommands:/playwright|puppeteer|chromium|google-chrome|smoke-[\w-]+/.test(source),
  bytes:Buffer.byteLength(source)};
}

export function scanWorkflows(folder=directory){
 const files=readdirSync(folder).filter(name=>/\.ya?ml$/.test(name)).sort();
 const workflows=files.map(filename=>inspectWorkflow(filename,readFileSync(join(folder,filename),'utf8')));
 const count=key=>workflows.filter(w=>w[key]).length;
 const countBy=key=>Object.fromEntries([...new Set(workflows.map(w=>w[key]))].sort()
  .map(value=>[value,workflows.filter(w=>w[key]===value).length]));
 return {summary:{workflowFiles:workflows.length,byClass:countBy('classification'),
  prTriggers:count('pr'),unfilteredPrTriggers:workflows.filter(w=>w.pr&&!w.prPathFiltered).length,
  manualEntries:count('manual'),reusableEntries:count('reusable'),
  headRefConditions:count('headRefCondition'),browserCandidates:count('hasBrowserCommands')},
  workflows};
}

export function checkWorkflowSafety(report){
 const get=name=>report.workflows.find(w=>w.filename===name);
 const ci=get('ci.yml'),pages=get('pages.yml');
 assert.ok(ci?.triggers.includes('pull_request'),'primary CI must handle PRs');
 assert.ok(ci?.manual,'primary CI full/release suites must remain dispatchable');
 assert.ok(pages?.triggers.includes('push'),'Pages must publish on main push');
 assert.ok(pages.pushBranches.includes('main'),'Pages main branch filter missing');
 assert.ok(pages.manual,'Pages manual recovery must remain dispatchable');
 for(const name of ['architecture-refactor-critical.yml','closeout-stage6-browser.yml']){
  const workflow=get(name);
  assert.ok(workflow?.manual&&workflow?.reusable,name+' lost manual/reusable entry');
  assert.ok(!workflow.pr,name+' is creating independent PR runs');
 }
 assert.equal(report.workflows.length,
  new Set(report.workflows.map(workflow=>workflow.filename)).size,
  'Duplicate workflow filename');
 return report.summary;
}

export function markdownInventory(report){
 const lines=['# GitHub Actions trigger inventory','',
  'Generated from checked-out workflow files. PR specialists are migration',
  'candidates, not automatically safe to disable.','','## Summary','',
  JSON.stringify(report.summary,null,2),'','## Workflows','',
  '| Workflow | Class | Triggers | PR paths | Head-ref gate | Manual |',
  '|---|---|---|---|---|---|'];
 for(const w of report.workflows)lines.push('| '+[w.filename,w.classification,
  w.triggers.join(', ')||'none',w.prPathFiltered?'filtered':'—',
  w.headRefCondition?'yes':'no',w.manual?'yes':'no'].join(' | ')+' |');
 return lines.join('\n')+'\n';
}

function main(){
 const args=process.argv.slice(2);
 const report=scanWorkflows();
 if(args.includes('--check'))checkWorkflowSafety(report);
 for(const [flag,value] of [['--json',JSON.stringify(report,null,2)+'\n'],
  ['--markdown',markdownInventory(report)]]){
  const i=args.indexOf(flag);
  if(i>=0){
   const target=args[i+1];
   assert.ok(target&&!target.startsWith('--'),flag+' requires an output path');
   mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,value);
  }
 }
 console.log('CI workflow inventory',JSON.stringify(report.summary));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
