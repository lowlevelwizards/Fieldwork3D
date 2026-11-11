/** A9: verify the contracted CI and production gates cannot be silently bypassed.
 * Checks maintained workflows, not old branch-specific history or unused files.
 */
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';

const paths={
 ci:'.github/workflows/ci.yml',
 architecture:'.github/workflows/architecture-refactor-critical.yml',
 browser:'.github/workflows/closeout-stage6-browser.yml',
 pages:'.github/workflows/pages.yml'
};
const read=path=>readFileSync(path,'utf8');
export function validateWorkflowContracts(wf){
 const must=(file,needle)=>assert.ok(wf[file].includes(needle),file+' missing '+needle);
 const no=(file,needle)=>assert.ok(!wf[file].includes(needle),file+' still contains '+needle);
 assert.ok(wf.ci.length<10000,'Primary CI has regrown into an obsolete branch gate catalog');
 no('ci',"startsWith(github.head_ref");
 must('ci','ci-regression-plan.mjs --run');
 must('ci','ci-regression-plan.mjs --check');
 must('ci','ci-workflow-contract.mjs');
 must('ci','--test tests/ci-regression-plan.test.mjs');
 must('ci','npm test');
 must('ci','npm run build');
 must('ci','audit-pages-release-checkpoint.mjs');
 assert.equal(wf.ci.split('audit-pages-release-checkpoint.mjs').length-1,1,
  'Single release checkpoint must not be duplicated in primary CI');
 must('architecture','breach-critical-suite.mjs');
 must('architecture','breach-architecture-boundaries.mjs');
 must('architecture','ci-workflow-contract.mjs');
 must('architecture','refactor/');
 must('architecture','npm run build');
 must('browser','tactical-flow:');
 must('browser','replay-and-lab:');
 must('browser','refactor/consolidation-');
 must('browser','smoke-closeout-stage6.mjs');
 must('browser','smoke-replay-r43b-bodycam-ui.mjs');
 must('browser','smoke-operator-lab-unified.mjs');
 must('pages','npm run build');
 must('pages','fieldwork-build.json');
 must('pages','Verify public Pages serves expected build');
 const missing=[];
 for(const text of Object.values(wf)){
  for(const match of text.matchAll(/\b(?:tests\/[\w.-]+\.test\.mjs|scripts\/[\w./-]+\.mjs)\b/g))
   if(!existsSync(match[0]))missing.push(match[0]);
 }
 assert.deepEqual([...new Set(missing)],[],'Broken executable references in maintained workflows');
 return {workflows:Object.keys(wf).length,primaryLines:wf.ci.split('\n').length};
}
const result=validateWorkflowContracts(Object.fromEntries(
 Object.entries(paths).map(([key,path])=>[key,read(path)])));
console.log('A9 CI and Pages workflow contracts verified:',JSON.stringify(result));
