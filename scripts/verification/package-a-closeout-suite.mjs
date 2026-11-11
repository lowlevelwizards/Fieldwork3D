/** A10: repeatable, bounded closeout verification for Consolidation Package A.
 * Does not replace the full historical suite (npm test), specialist browser
 * smokes, performance checks or exact GitHub Pages release validation.
 *
 * node scripts/verification/package-a-closeout-suite.mjs --check | --list | --run
 */
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

export const stageCoverage=Object.freeze([
 {stage:'A0',test:'tests/consolidation-inventory.test.mjs'},
 {stage:'A1',test:'tests/consolidation-stage1-removal.test.mjs'},
 {stage:'A2',test:'tests/consolidation-stage2-config-persistence.test.mjs'},
 {stage:'A3',test:'tests/consolidation-stage3-app-flow.test.mjs'},
 {stage:'A4',test:'tests/consolidation-stage4-targeting.test.mjs'},
 {stage:'A5',test:'tests/consolidation-stage5-replay-presentation.test.mjs'},
 {stage:'A6',test:'tests/consolidation-a6-main-composition.test.mjs'},
 {stage:'A7',test:'tests/consolidation-stage7-domain-ownership.test.mjs'},
 {stage:'A8',test:'tests/consolidation-stage8-world-ownership.test.mjs'},
 {stage:'A9',test:'tests/ci-regression-plan.test.mjs'},
 {stage:'A10',test:'tests/consolidation-a10-final-closeout.test.mjs'}
]);

// Integration/regression sentinels preserve simulation order, presentation
// disclosure, replay/lifecycle, AAV4 cross-branch integration, and physicality.
export const integrationCoverage=Object.freeze([
 'tests/breach-closeout-stage1-plan-authoring.test.mjs',
 'tests/breach-closeout-stage2-simulation-phases.test.mjs',
 'tests/breach-closeout-stage3-presentation.test.mjs',
 'tests/breach-closeout-stage5-world-isolation.test.mjs',
 'tests/breach-closeout-stage6-integration.test.mjs',
 'tests/breach-roadmap2-stage3-knowledge.test.mjs',
 'tests/breach-roadmap2-stage12-world-context.test.mjs',
 'tests/after-action-v4-stage3-persistent-models.test.mjs'
]);
export const followupChecks=Object.freeze([
 'scripts/verification/breach-architecture-boundaries.mjs',
 'scripts/verification/ci-workflow-contract.mjs'
]);
export const suiteFiles=()=>[...new Set([...stageCoverage.map(x=>x.test),...integrationCoverage])].sort();
export function checkSuite(){
 assert.deepEqual(stageCoverage.map(x=>x.stage),
  Array.from({length:11},(_,i)=>'A'+i),'Package A stages A0–A10 must all be covered');
 assert.equal(new Set(stageCoverage.map(x=>x.test)).size,stageCoverage.length);
 const missing=[...suiteFiles(),...followupChecks].filter(x=>!existsSync(x));
 assert.deepEqual(missing,[],'Package A closeout references missing tests/checks');
 return {stages:stageCoverage.length,tests:suiteFiles().length,postChecks:followupChecks.length};
}
function run(cmd,args){
 const child=spawnSync(cmd,args,{stdio:'inherit',env:process.env});
 if(child.error)throw child.error;
 if(child.status!==0)process.exit(child.status??1);
}
function main(){
 const args=process.argv.slice(2);
 if(args.includes('--check')){
  console.log('Package A closeout manifest valid:',JSON.stringify(checkSuite()));return;
 }
 if(args.includes('--list')){
  checkSuite();
  console.log(suiteFiles().join('\n'));
  console.log(followupChecks.join('\n'));return;
 }
 if(!args.includes('--run'))throw Error('Use --check, --list or --run');
 console.log('Running Package A A0–A10 integration:',JSON.stringify(checkSuite()));
 run(process.execPath,['--experimental-strip-types','--test','--test-concurrency=2',...suiteFiles()]);
 for(const script of followupChecks)run(process.execPath,[script]);
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])main();
