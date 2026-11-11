/** A9 CI: changed-file regression selection, independent of branch names.
 * --check validates test references; --list prints selection; --run executes it.
 * --files path1 path2 overrides the git diff for acceptance/diagnostics.
 */
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

export const baseline=[
 'tests/breach-roadmap2-stage1-contracts.test.mjs',
 'tests/breach-closeout-stage2-simulation-phases.test.mjs',
 'tests/breach-roadmap2-stage3-knowledge.test.mjs',
 'tests/consolidation-stage8-world-ownership.test.mjs',
 'tests/replay-r2-recording.test.mjs',
 'tests/after-action-v4-stage3-persistent-models.test.mjs'
];
export const domains=[
 {name:'simulation',match:/^src\/.*(?:session|simulation|sim-|combat|ballistic|projectile|shot|damage|wound|ai-|awareness|enemy|civilian|actor|morale|tactical-state)/i,
  tests:['tests/breach-roadmap2-stage10-combat.test.mjs','tests/breach-roadmap4-simulation-phases.test.mjs','tests/breach-roadmap2-deterministic.test.mjs']},
 {name:'movement-and-doors',match:/^src\/.*(?:movement|motor|locomotion|door|traversal|physical|collision|path|plan|order|waypoint|interaction)/i,
  tests:['tests/breach-roadmap2-stage7-motor.test.mjs','tests/breach-roadmap2-stage8-orders.test.mjs','tests/doorway-right-of-way-session.test.mjs','tests/breach-physical-interactions-nov8.test.mjs']},
 {name:'world-and-sites',match:/^src\/.*(?:world|site|geometry|generator|worldgen|scene|map-|floor|architecture|cover|furniture)/i,
  tests:['tests/breach-roadmap2-stage12-world-context.test.mjs','tests/breach-closeout-stage5-world-isolation.test.mjs','tests/breach-roadmap2-stage2-physical-integrity.test.mjs','tests/breach-scene-memory-lifecycle-p6.test.mjs']},
 {name:'visibility-and-presentation',match:/^src\/.*(?:fog|visibility|intel|knowledge|breach-3d|breach-2d|render|presentation|scene|camera|lighting|sight)/i,
  tests:['tests/breach-roadmap3-3d-disclosure.test.mjs','tests/breach-fog-visibility.test.mjs','tests/breach-closeout-stage3-presentation.test.mjs','tests/breach-scene-frame-p7.test.mjs']},
 {name:'replay-and-debrief',match:/^src\/.*(?:replay|debrief|after-action|mission-screen|recording|timeline|incident)/i,
  tests:['tests/breach-closeout-stage6-integration.test.mjs','tests/after-action-v4-stage1-navigation.test.mjs','tests/after-action-v4-stage2-hierarchy.test.mjs','tests/replay-r3-archive.test.mjs']},
 {name:'operator-and-equipment',match:/^src\/.*(?:operator|animation|pose|weapon|arsenal|equipment|rig|armor|gear|uniform|stock|magazine)/i,
  tests:['tests/breach-closeout-stage4-pose-output.test.mjs','tests/breach-roadmap2-stage11-animation.test.mjs','tests/operator-lab-unified-poses.test.mjs','tests/arsenal-v2-game-integration.test.mjs']},
 {name:'app-and-campaign',match:/^src\/.*(?:campaign|quick.?play|mission|config|settings|storage|menu|app-|bootstrap|main|ui\/|app\/)/i,
  tests:['tests/consolidation-stage3-app-flow.test.mjs','tests/consolidation-stage2-config-persistence.test.mjs','tests/quick-play-scenario-generator.test.mjs','tests/campaign-02.test.mjs']}
];
export const configuredTestPaths=()=>[...new Set([...baseline,...domains.flatMap(g=>g.tests)])].sort();

/** A10: a changed test must actually execute; non-source runtime inputs and
 * test/CI infrastructure require the curated critical fallback rather than a
 * misleading green check from the universal baseline alone. fileExists may be
 * supplied by tests to model removed files without modifying the worktree.
 */
export function selectCiTests(paths=[],fileExists=existsSync){
 const files=[...new Set(paths)].sort(),selected=new Set(baseline),matched=[],unknown=[];
 const changedTests=[],deletedTests=[],riskPaths=[];
 for(const group of domains)
  if(files.some(p=>group.match.test(p))){
   matched.push(group.name);
   for(const file of group.tests)selected.add(file);
  }
 for(const file of files){
  if(file.startsWith('src/')){
   if(!domains.some(g=>g.match.test(file)))unknown.push(file);
  }else if(/^tests\/.*\.test\.mjs$/.test(file)){
   if(fileExists(file)){
    selected.add(file);
    changedTests.push(file);
   }else{
    deletedTests.push(file);
    riskPaths.push(file);
   }
  }else if(
   file.startsWith('tests/')||
   file.startsWith('scripts/')||
   file.startsWith('.github/')||
   /^(?:data|public|assets|static|textures|models)\//.test(file)||
   /^[^/]+\.(?:html|css|js|mjs|ts|tsx|json|svg|png|webp|glb|gltf)$/.test(file)
  )riskPaths.push(file);
 }
 return {files,tests:[...selected].sort(),domains:matched,unknown,
  changedTests,deletedTests,riskPaths,
  runBroadCritical:unknown.length>0||riskPaths.length>0};
}
export function checkCatalog(){
 assert.equal(new Set(domains.map(g=>g.name)).size,domains.length);
 for(const group of domains){
  assert.ok(group.tests.length&&group.match instanceof RegExp);
  assert.equal(new Set(group.tests).size,group.tests.length,'Duplicates in '+group.name);
 }
 const missing=configuredTestPaths().filter(p=>!existsSync(p));
 assert.deepEqual(missing,[],'Missing A9 test references');
 return {domains:domains.length,uniqueTests:configuredTestPaths().length};
}
function diffFiles(){
 const base=process.env.CI_BASE_REF;
 if(!base)return [];
 assert.match(base,/^[a-zA-Z0-9._/-]+$/,'Unsafe CI base ref');
 const result=spawnSync('git',['diff','--name-only','--diff-filter=ACMRTD','origin/'+base+'...HEAD'],{encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('PR git diff failed: '+result.stderr);
 return result.stdout.trim().split('\n').filter(Boolean);
}
function userFiles(args){
 const i=args.indexOf('--files');
 if(i<0)return null;
 const files=[];
 for(let j=i+1;j<args.length&&!args[j].startsWith('--');j++)files.push(args[j]);
 return files;
}
function main(){
 const args=process.argv.slice(2);
 if(args.includes('--check')){
  console.log('A9 CI catalog verified: '+JSON.stringify(checkCatalog()));return;
 }
 if(!args.includes('--run')&&!args.includes('--list'))
  throw Error('Use --check, --list or --run [--files paths...]');
 checkCatalog();
 const plan=selectCiTests(userFiles(args)??diffFiles());
 console.log('A9 CI selection '+JSON.stringify({files:plan.files,domains:plan.domains,unknown:plan.unknown,changedTests:plan.changedTests,deletedTests:plan.deletedTests,riskPaths:plan.riskPaths,tests:plan.tests.length,broadCritical:plan.runBroadCritical}));
 if(args.includes('--list')){
  console.log(plan.tests.join('\n'));
  if(plan.runBroadCritical)console.log('scripts/verification/breach-critical-suite.mjs');
  return;
 }
 const result=spawnSync(process.execPath,['--experimental-strip-types','--test','--test-concurrency=2',...plan.tests],{stdio:'inherit',env:process.env});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
 if(plan.runBroadCritical){
  const broad=spawnSync(process.execPath,['scripts/verification/breach-critical-suite.mjs'],{stdio:'inherit',env:process.env});
  if(broad.error)throw broad.error;
  process.exit(broad.status??1);
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])main();
