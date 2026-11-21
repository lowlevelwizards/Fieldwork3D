import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectWorkflow,scanWorkflows,checkWorkflowSafety,markdownInventory}
 from '../scripts/verification/ci-workflow-inventory.mjs';

test('parse manual, historical push, PR path-filter and reusable triggers',()=>{
 const old=inspectWorkflow('old.yml','name: Old\non:\n  push:\n    branches: [feature/old-stage]\n  workflow_dispatch:\njobs:\n  verify:\n');
 assert.deepEqual(old.triggers,['push','workflow_dispatch']);
 assert.equal(old.classification,'historical-branch-push');
 assert.deepEqual(old.pushBranches,['feature/old-stage']);
 const pr=inspectWorkflow('art.yml',"on:\n  pull_request:\n    branches: [main]\n    paths:\n      - 'src/art/**'\n  workflow_dispatch:\njobs:\n  critical:\n    if: startsWith(github.head_ref, 'feature/art-')\n");
 assert.equal(pr.pr,true);
 assert.equal(pr.prPathFiltered,true);
 assert.equal(pr.headRefCondition,true);
 assert.equal(pr.manual,true);
 const reusable=inspectWorkflow('visual.yml','on:\n  workflow_call:\n  workflow_dispatch:\njobs:\n');
 assert.equal(reusable.classification,'reusable-specialist');
 assert.equal(reusable.pr,false);
});

test('inventory output is deterministic and protected workflows cannot evade required gates',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fieldwork-ci-inventory-'));
 const put=(name,text)=>writeFileSync(join(dir,name),text);
 try{
  put('ci.yml','on:\n  pull_request:\n  workflow_dispatch:\njobs:\n');
  put('pages.yml','on:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n');
  for(const name of ['architecture-refactor-critical.yml','closeout-stage6-browser.yml'])
   put(name,'on:\n  workflow_call:\n  workflow_dispatch:\njobs:\n');
  const report=scanWorkflows(dir);
  assert.equal(report.summary.workflowFiles,4);
  assert.equal(report.summary.prTriggers,1);
  assert.equal(report.summary.reusableEntries,2);
  assert.equal(report.summary.manualEntries,4);
  assert.equal(checkWorkflowSafety(report).workflowFiles,4);
  assert.match(markdownInventory(report),/closeout-stage6-browser.yml/);
  put('closeout-stage6-browser.yml','on:\n  pull_request:\n  workflow_dispatch:\njobs:\n');
  assert.throws(()=>checkWorkflowSafety(scanWorkflows(dir)),/lost manual\/reusable entry/);
  put('pages.yml','on:\n  push:\n    branches: [feature/old]\n  workflow_dispatch:\njobs:\n');
  assert.throws(()=>checkWorkflowSafety(scanWorkflows(dir)),/Pages main branch filter missing/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
