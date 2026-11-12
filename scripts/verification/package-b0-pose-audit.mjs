/** Package B0 — read-only architecture census and enforceable pose boundaries.
 * Does not run animation, import Three.js, mutate a rig or claim that a regex
 * transform candidate proves an authoritative writer.
 *
 * node scripts/verification/package-b0-pose-audit.mjs --check
 * node scripts/verification/package-b0-pose-audit.mjs --check \
 *   --json artifacts/package-b0/audit.json \
 *   --markdown artifacts/package-b0/audit.md
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,extname,join} from 'node:path';

export const B0_BASELINE='76391519873120fa1b9011c17a0c8eeb317f63fb';
export const REQUIRED_SURFACES=Object.freeze({
 'src/breach-operator-animation-contract.ts':'read-only frame input',
 'src/breach-operator-rig.ts':'construction, canonical/legacy axes, disposal and public API',
 'src/breach-operator-animation-controller.ts':'compatibility evaluator and final pose commit call',
 'src/breach-operator-pose-output.ts':'registered rig-scoped final pose output',
 'src/breach-operator-animation-frame.ts':'seek-aware frame time and rig scratch',
 'src/breach-operator-pose-scratch.ts':'reusable IK scratch',
 'src/breach-operator-appearance.ts':'equipment and appearance fingerprint',
 'src/breach-operator-lower-body.ts':'recorded/live foot targets and leg IK',
 'src/breach-live-gait.ts':'live hybrid gait compatibility mode',
 'src/breach-pose-director.ts':'action and upper-body strategy choice',
 'src/breach-pose-transition-director.ts':'handling history and carry blending',
 'src/breach-unified-upper-body.ts':'coupled, coordinated, support and fallback IK',
 'src/breach-pose-frame-finalizer.ts':'trauma, cavity and end-of-frame',
 'src/breach-operator-sling-pose.ts':'late sling attachment visual',
 'src/breach-pose-v3-coordinated.ts':'V3 coordinated legacy candidate',
 'src/breach-pose-v3-reload-choreography.ts':'V3 reload hand corridor',
 'src/breach-reload-v4-hand.ts':'V4 hand choreography',
 'src/breach-reload-v4-magazine-handoff.ts':'V4 stowage and handoffs',
 'src/breach-weapon-pose.ts':'weapon and stock fitting',
 'src/breach-3d.ts':'live and replay pose adapter',
 'src/breach-replay-motion.ts':'recorded playback motion and foot targets',
 'src/breach-operator-lab.ts':'Lab pose and historical gait comparisons',
 'src/operator-studio.ts':'Studio deterministic and 24 Hz armed preview',
 'src/operator-pose-workbench.ts':'independent offline edit-rig writer'
});
export const CONTRACT_TESTS=Object.freeze([
 'tests/breach-roadmap2-stage11-animation.test.mjs',
 'tests/breach-closeout-stage4-pose-output.test.mjs',
 'tests/breach-pose-director.test.mjs',
 'tests/breach-pose-transition-director.test.mjs',
 'tests/breach-pose-v3-baseline.test.mjs',
 'tests/breach-reload-v4-rig.test.mjs',
 'tests/breach-motion-22.test.mjs',
 'tests/operator-lab-unified-poses.test.mjs',
 'tests/operator-pose-workbench.test.mjs',
 'tests/breach-unified-pose-stability.test.mjs'
]);
export const PUBLIC_CALLERS=Object.freeze([
 'src/breach-3d.ts','src/breach-operator-lab.ts','src/operator-studio.ts'
]);
export const TRANSFORM_ROOTS=Object.freeze([
 'breach-operator-animation-controller.ts','breach-operator-lower-body.ts',
 'breach-pose-frame-finalizer.ts','breach-operator-sling-pose.ts',
 'breach-operator-pose-output.ts','breach-operator-rig.ts',
 'breach-3d.ts','breach-operator-lab.ts','operator-studio.ts',
 'operator-pose-workbench.ts'
]);
const norm=path=>path.replaceAll('\\','/');
const sha=s=>createHash('sha256').update(s).digest('hex');
const read=(root,file)=>readFileSync(resolve(root,file),'utf8');
function sourceFiles(root){
 const discovered=[];
 function visit(dir){
  for(const entry of readdirSync(resolve(root,dir),{withFileTypes:true})){
   const next=norm(join(dir,entry.name));
   if(entry.isDirectory())visit(next);
   else if(entry.isFile()&&/\.tsx?$/.test(entry.name))discovered.push(next);
  }
 }
 visit('src');
 return discovered.sort();
}
export function poseCallsites(path,content){
 // Each returned record is a textual call candidate, not proof of a live
 // invocation (comments and test fixtures could still contain names).
 return content.split('\n').flatMap((line,index)=>{
  if(!/\bposeOperator\s*\(/.test(line)||/^\s*(?:export\s+)?function\s+poseOperator\s*\(/.test(line))
   return [];
  return [{path,line:index+1,excerpt:line.trim().slice(0,160)}];
 });
}
export function transformCandidates(path,content){
 // Heuristic hotspot count only. Includes preview cameras/scene nodes and
 // intentional working-rig assignments. Never assert "unique pose writer".
 const matches=[];
 for(const [index,line] of content.split('\n').entries()){
  if(
   /\.(?:position|rotation|quaternion|scale)\.(?:[xyzw]\s*(?:[+\-*/]?=)|(?:set|copy|multiply|slerp|lerp|setFromEuler|setFromAxisAngle)\s*\()/.test(line)||
   /\.visible\s*(?:[+\-*/]?=)/.test(line)
  )matches.push(index+1);
 }
 return {path,candidateLines:matches.length,firstLines:matches.slice(0,12)};
}
export function inspectB0Architecture(root=process.cwd()){
 const missing=Object.keys(REQUIRED_SURFACES).concat(CONTRACT_TESTS)
  .filter(file=>!existsSync(resolve(root,file)));
 assert.deepEqual(missing,[],'B0 audit contract paths must exist');
 const files=sourceFiles(root),sources=new Map();
 for(const file of files)sources.set(file,read(root,file));
 const get=file=>sources.get(file)??read(root,file);
 const controller=get('src/breach-operator-animation-controller.ts');
 const rig=get('src/breach-operator-rig.ts');
 const output=get('src/breach-operator-pose-output.ts');
 const input=get('src/breach-operator-animation-contract.ts');
 const lower=get('src/breach-operator-lower-body.ts');
 const scene=get('src/breach-3d.ts');
 const lab=get('src/breach-operator-lab.ts');
 const studio=get('src/operator-studio.ts');
 const bench=get('src/operator-pose-workbench.ts');
 const gait=get('src/breach-live-gait.ts');
 const lifecycle=get('src/breach-operator-animation-frame.ts');
 const count=(content,pattern)=>[...content.matchAll(pattern)].length;
 const first=key=>controller.indexOf(key);
 const stages=[
  'beginOperatorAnimationFrame(r,p,dt)',
  'updateOperatorAppearance(r,p)',
  'sampleOperatorFootContacts(r,p,physicalSpeed,moving,travelYaw)',
  'applyOperatorLegIK(r,p,scratch,targets,kick,headingYaw,smooth)',
  'finishOperatorPoseFrame(r,p,',
  'commitOperatorPoseOutput(r,p)'
 ];
 const callsites=files.flatMap(file=>poseCallsites(file,sources.get(file)));
 const hotspot=TRANSFORM_ROOTS.map(name=>transformCandidates('src/'+name,get('src/'+name)));
 const allTransformCandidates=files.map(file=>transformCandidates(file,sources.get(file)))
  .filter(record=>record.candidateLines>0)
  .sort((a,b)=>b.candidateLines-a.candidateLines||a.path.localeCompare(b.path));
 const poseImplementations=files.filter(file=>
  /export function poseOperator\s*\(/.test(sources.get(file)));
 const commitImplementations=files.filter(file=>
  /export function commitOperatorPoseOutput\s*\(/.test(sources.get(file)));
 // Discover every final publisher anywhere in src, not just known owners.
 const externalCommitCallers=files.filter(file=>
  file!=='src/breach-operator-pose-output.ts'&&
  /\bcommitOperatorPoseOutput\s*\(/.test(sources.get(file)));
 const moduleConsumers=Object.fromEntries(Object.keys(REQUIRED_SURFACES).map(target=>
  [target,files.filter(file=>file!==target&&
   [...sources.get(file).matchAll(/from\s*['"](\.{1,2}\/[^'"]+)['"]/g)].some(match=>
    norm(join(dirname(file),match[1]))===target))]));
 const contract={
  inputDeclared:/export type OperatorPose=\{/.test(input),
  publicExport:/export \{poseOperator\} from '.\/breach-operator-animation-controller\.ts'/.test(rig),
  evaluatorCount:count(controller,/export function poseOperator\s*\(/g),
  finalCommitCalls:count(controller,/\bcommitOperatorPoseOutput\(r,p\)/g),
  finalCommitDeclaration:count(output,/export function commitOperatorPoseOutput\s*\(/g),
  stageIndices:stages.map(stage=>first(stage)),
  rigOutputWeakMap:/new WeakMap<OperatorRig,MutableOutput>\(\)/.test(output),
  outputBuffer11:/new Float64Array\(11\)/.test(output),
  duplicateOwnerReject:/Duplicate pose-output owner/.test(output),
  outputDisposed:/resetOperatorPoseOutput\(rig\)/.test(rig),
  replayFeetFirst:/p\.replayFeet\?\s*validatedReplayFeet\(gaitInput,p\.replayFeet\):\s*advanceFootsteps\(r\.footsteps,gaitInput\)/.test(lower),
  frameSeekAware:/const discontinuity=dt<0\|\|/.test(lifecycle),
  livePoseV3V4:/poseV3Preview:true,\s*poseV4ReloadPreview:true/.test(scene),
  replayDeterministic:/deterministic:!!replay/.test(scene),
  sceneUsesHistoricalFeet:/replayFeet:replay\?\.feet\[actor\.id\]/.test(scene),
  labUsesCommonPose:/\bposeOperator\(rig,\{/.test(lab),
  studioUsesCommonPose:/\bposeOperator\(rig,armedPose,0\)/.test(studio),
  labCanCompareGaits:/gaitComparing&&rig\.lastPose/.test(lab),
  studioHasOwnVisualRate:/1000\/24/.test(studio),
  benchIsSeparateWriter:/export function applyWorkbenchPose\(/.test(bench)&&
   /rig\.weapon\.position\.copy\(/.test(bench),
  liveGaitExplicit:/LIVE_GAIT_MODE:'hybrid'\|'legacy'='hybrid'/.test(gait)
 };
 return {
  baselineSha:B0_BASELINE,
  scope:'static read-only source audit, not proof of zero transient writes',
  sourceTypeScriptFiles:files.length,
  keyModules:Object.entries(REQUIRED_SURFACES).map(([path,role])=>({
    path,role,lines:get(path).split('\n').length,bytes:Buffer.byteLength(get(path)),
    sha256:sha(get(path))
  })),
  contract,
  callsites,
  hotspot,
  allTransformCandidates,
  poseImplementations,
  commitImplementations,
  externalCommitCallers,
  moduleConsumers,
  flags:Object.fromEntries(['poseV3Preview','poseV4ReloadPreview','poseV3StrictContact',
   'hybridSupport','handlingOverride','deterministic','replayFeet'].map(flag=>[
    flag,{controller:count(controller,new RegExp('\\b'+flag+'\\b','g')),
      scene:count(scene,new RegExp('\\b'+flag+'\\b','g')),
      lab:count(lab,new RegExp('\\b'+flag+'\\b','g')),
      studio:count(studio,new RegExp('\\b'+flag+'\\b','g'))}
   ])),
  criticalTests:[...CONTRACT_TESTS]
 };
}
export function verifyB0Architecture(report){
 const c=report.contract;
 for(const [key,value] of Object.entries(c)){
  if(typeof value==='boolean')assert.ok(value,'B0 boundary changed: '+key);
 }
 assert.equal(c.evaluatorCount,1,'Exactly one public evaluator remains in animation controller');
 assert.deepEqual(report.poseImplementations,['src/breach-operator-animation-controller.ts'],
  'A second poseOperator implementation is not a safe preview adapter');
 assert.deepEqual(report.commitImplementations,['src/breach-operator-pose-output.ts'],
  'One public commit implementation; do not add a mode-local equivalent');
 assert.deepEqual(report.externalCommitCallers,['src/breach-operator-animation-controller.ts'],
  'Only the canonical evaluator may commit the final public pose output');
 assert.equal(c.finalCommitDeclaration,1,'Exactly one named output commit implementation');
 assert.equal(c.finalCommitCalls,1,'Exactly one final published pose output per evaluation');
 assert.ok(c.stageIndices.every(i=>i>=0),'All ordered evaluation stages must be present');
 assert.deepEqual(c.stageIndices,[...c.stageIndices].sort((a,b)=>a-b),
  'Final commit must follow appearance, contact, IK and finalization');
 for(const path of PUBLIC_CALLERS)
  assert.ok(report.callsites.some(call=>call.path===path),'Missing public mode caller: '+path);
 assert.ok(report.hotspot.some(row=>row.path==='src/operator-pose-workbench.ts'&&row.candidateLines>0),
  'Workbench separate transform writer must be explicitly tracked');
 assert.ok(report.hotspot.some(row=>row.path==='src/breach-operator-animation-controller.ts'&&row.candidateLines>0),
  'Legacy working-rig transform hotspot must not be silently reclassified as pure');
 return {sourceFiles:report.sourceTypeScriptFiles,
  modules:report.keyModules.length,callsiteCandidates:report.callsites.length,
  transformCandidates:report.hotspot.reduce((sum,x)=>sum+x.candidateLines,0),
  sourceTransformCandidateFiles:report.allTransformCandidates.length,
  checkedBoundaries:Object.keys(c).length};
}
export function formatB0Markdown(report){
 const audit=verifyB0Architecture(report);
 return [
  '# Package B0 — Reproducible operator pose architecture census',
  '',
  '**Starting main:** \`'+report.baselineSha+'\`.',
  '**Source and method:** static source scan at the workflow checkout commit. No live rig is mutated.',
  '**Limits:** transform candidates include intentional preview/scene writes; they are not individually certified transform owners.',
  '',
  '## Counts',
  '',
  '- TypeScript source files: '+audit.sourceFiles,
  '- Required owner modules: '+audit.modules,
  '- Direct textual poseOperator callsite candidates: '+audit.callsiteCandidates,
  '- Transform-looking lines across ten audited surfaces: '+audit.transformCandidates,
  '',
  '## Direct public pose consumers',
  '',
  '| Source | Line | Candidate |',
  '| --- | ---: | --- |',
  ...report.callsites.map(x=>'| \`'+x.path+'\` | '+x.line+' | \`'+x.excerpt.replaceAll('|','\\|')+'\` |'),
  '',
  '## Transform-writing hotspots (heuristic only)',
  '',
  '| Source | Candidate lines | Example lines |',
  '| --- | ---: | --- |',
  ...report.hotspot.map(x=>'| \`'+x.path+'\` | '+x.candidateLines+
   ' | '+x.firstLines.join(', ')+' |'),
  '',
  '## Full-source transform candidate inventory (all TypeScript sources)',
  '',
  'Syntax-only candidates include camera, effects, wardrobe, and graphics. These do not certify an anatomical writer.',
  'The JSON artifact retains all candidate paths and line samples; the table shows the top 35.',
  '',
  '| Source | Candidate lines |',
  '| --- | ---: |',
  ...report.allTransformCandidates.slice(0,35).map(x=>'| '+x.path+' | '+x.candidateLines+' |'),
  '',
  '## Direct dependents of the 24 mandatory pose-domain modules',
  '',
  '| Module | Direct TypeScript importers |',
  '| --- | ---: |',
  ...Object.entries(report.moduleConsumers).map(([name,users])=>
   '| '+name+' | '+users.length+' |'),
  '',
  '## Current architectural contracts',
  '',
  '| Contract | Observed |',
  '| --- | --- |',
  ...Object.entries(report.contract).map(([k,v])=>'| \`'+k+'\` | '+
   (typeof v==='object'?JSON.stringify(v):String(v))+' |'),
  '',
  '## Current mandatory module owners and digests',
  '',
  '| Module | Lines | SHA-256 | Owner role |',
  '| --- | ---: | --- | --- |',
  ...report.keyModules.map(x=>'| \`'+x.path+'\` | '+x.lines+
   ' | \`'+x.sha256.slice(0,16)+'…\` | '+x.role+' |'),
  '',
  '## Interpretation',
  '',
  'The existing output registry is the sole **public final** pose commit.',
  'Working-rig intermediate assignments in the legacy evaluator, lower-body IK, finalizers and standalone workbench remain separate audit targets for B1–B7.',
  'Counts are observations at this commit, not hardcoded thresholds or permission to remove still-used legacy paths.',
  'The dedicated CI and Stage 4/Stage 11 contract tests provide behavior, allocation and deterministic seek evidence that a static census cannot supply.',
  ''
 ].join('\n');
}
function main(){
 const args=process.argv.slice(2);
 if(!args.includes('--check'))throw Error('Use --check [--json path] [--markdown path]');
 const report=inspectB0Architecture(),summary=verifyB0Architecture(report);
 for(const [flag,format] of [['--json',()=>JSON.stringify(report,null,2)+'\n'],
  ['--markdown',()=>formatB0Markdown(report)]]){
  const index=args.indexOf(flag);
  if(index>=0){
   const dest=args[index+1];
   assert.ok(dest&&!dest.startsWith('--'),'Missing output path for '+flag);
   const outfile=resolve(process.cwd(),dest);
   mkdirSync(dirname(outfile),{recursive:true});
   writeFileSync(outfile,format());
  }
 }
 console.log('B0 pose ownership census verified:',JSON.stringify(summary));
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname)main();
