import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 B0_BASELINE,REQUIRED_SURFACES,CONTRACT_TESTS,PUBLIC_CALLERS,
 poseCallsites,transformCandidates,inspectB0Architecture,
 verifyB0Architecture,formatB0Markdown
} from '../scripts/verification/package-b0-pose-audit.mjs';

let cached;
const audit=()=>cached??=inspectB0Architecture();

test('B0 inventory targets actual live pose, replay, Labs, preview and workbench owners',()=>{
 const report=audit();
 assert.equal(report.baselineSha,B0_BASELINE);
 assert.equal(Object.keys(REQUIRED_SURFACES).length,24);
 assert.ok(report.sourceTypeScriptFiles>800);
 for(const path of PUBLIC_CALLERS)assert.ok(report.callsites.some(x=>x.path===path));
 assert.ok(report.keyModules.every(x=>x.sha256.length===64&&x.lines>10));
 assert.ok(CONTRACT_TESTS.length>=10);
});

test('B0 pose evaluator retains exactly one final public commit after ordered stage evaluation',()=>{
 const c=audit().contract;
 assert.equal(c.evaluatorCount,1);
 assert.equal(c.finalCommitDeclaration,1);
 assert.equal(c.finalCommitCalls,1);
 assert.deepEqual(c.stageIndices,[...c.stageIndices].sort((a,b)=>a-b));
 assert.ok(c.stageIndices.every(x=>x>=0));
 assert.ok(c.rigOutputWeakMap&&c.outputBuffer11&&c.duplicateOwnerReject&&c.outputDisposed);
 assert.ok(c.benchUsesSharedPublisher,'B7 offline authoring must use B2 atomic output');
});

test('B0 respects fixed contact, replay seek, live v3/v4 and visual-only preview authorities',()=>{
 const c=audit().contract;
 for(const k of [
  'inputDeclared','publicExport','replayFeetFirst','frameSeekAware',
  'livePoseV3V4','replayDeterministic','sceneUsesHistoricalFeet',
  'labUsesCommonPose','studioUsesCommonPose','labCanCompareGaits',
  'studioHasOwnVisualRate','benchUsesSharedPublisher','liveGaitExplicit'
 ])assert.ok(c[k],'Lost B0 authority: '+k);
});

test('B0 callsite scanner locates calls with line evidence and excludes declarations',()=>{
 assert.deepEqual(poseCallsites('src/fake.ts',[
  'export function poseOperator(r,p,dt){',
  ' return null;',
  '}',
  'poseOperator(rig,p,0);'
 ].join('\n')),[{path:'src/fake.ts',line:4,excerpt:'poseOperator(rig,p,0);'}]);
 const sites=audit().callsites;
 assert.ok(sites.some(x=>x.path==='src/breach-3d.ts'&&x.excerpt.includes('poseOperator(')));
 assert.ok(sites.some(x=>x.path==='src/breach-operator-lab.ts'));
 assert.ok(sites.some(x=>x.path==='src/operator-studio.ts'));
});

test('B0 transform metrics are heuristic: they locate candidates, not certify authoritative writers',()=>{
 const fake=transformCandidates('src/fixture.ts',[
  'rig.weapon.position.copy(point);',
  'rig.head.rotation.y=1;',
  'rig.visible=true;',
  '// no transform',
  'const x=rig.weapon.position;',
  'poseOperator(rig,p,0);'
 ].join('\n'));
 assert.deepEqual(fake.firstLines,[1,2,3]);
 const hotspots=audit().hotspot;
 assert.ok(hotspots.find(x=>x.path==='src/breach-operator-animation-controller.ts')?.candidateLines>20);
 assert.ok(hotspots.find(x=>x.path==='src/operator-pose-workbench.ts')?.candidateLines>0);
});

test('B0 validator fails closed if the one-final-commit contract changes',()=>{
 const report=audit();
 assert.ok(verifyB0Architecture(report).checkedBoundaries>15);
 const broken={...report,contract:{...report.contract,finalCommitCalls:2}};
 assert.throws(()=>verifyB0Architecture(broken),/one final published pose output|one final/i);
 const missing={...report,callsites:report.callsites.filter(x=>x.path!=='src/operator-studio.ts')};
 assert.throws(()=>verifyB0Architecture(missing),/Missing public mode caller/);
 const swapped={...report,contract:{...report.contract,
  stageIndices:[...report.contract.stageIndices].reverse()}};
 assert.throws(()=>verifyB0Architecture(swapped),/Final commit must follow/);
});

test('B0 generated evidence names all owners, modes, risks and source digests',()=>{
 const md=formatB0Markdown(audit());
 assert.match(md,/Package B0 — Reproducible operator pose architecture census/);
 assert.match(md,/src\/breach-3d\.ts/);
 assert.match(md,/src\/operator-studio\.ts/);
 assert.match(md,/src\/operator-pose-workbench\.ts/);
 assert.match(md,/heuristic only/);
 assert.match(md,/SHA-256/);
 for(const k of ['poseV3Preview','poseV4ReloadPreview','deterministic','replayFeet'])
  assert.ok(k in audit().flags,k);
});

test('B0 must leave production animation inputs, simulation and tools untouched',()=>{
 const ci=readFileSync(new URL('../.github/workflows/package-b-pose-architecture.yml',import.meta.url),'utf8');
 assert.match(ci,/package-b0-pose-audit\.mjs --check/);
 assert.match(ci,/tests\/package-b0-pose-audit\.test\.mjs/);
 assert.match(ci,/breach-closeout-stage4-pose-output\.test\.mjs/);
 assert.match(ci,/breach-roadmap2-stage11-animation\.test\.mjs/);
 assert.match(ci,/npm run build/);
 assert.match(ci,/upload-artifact@v4/);
});

test('B0 scans ALL source files for transform candidates and duplicate public pose output writers',()=>{
 const report=audit();
 assert.deepEqual(report.poseImplementations,
  ['src/breach-operator-animation-controller.ts']);
 assert.deepEqual(report.commitImplementations,
  ['src/breach-operator-pose-output.ts']);
 assert.deepEqual(report.externalCommitCallers,[
  'src/breach-operator-animation-controller.ts','src/operator-pose-workbench.ts'
 ]);
 assert.ok(report.allTransformCandidates.length>report.hotspot.length,
  'Full-source audit must include more than the ten known hotspots');
 assert.ok(report.allTransformCandidates.some(x=>x.path==='src/operator-pose-workbench.ts'));
 assert.ok(report.allTransformCandidates.every(x=>x.candidateLines>0));
 assert.ok(report.moduleConsumers['src/breach-operator-animation-contract.ts'].length>0);
 const invalid={...report,externalCommitCallers:[...report.externalCommitCallers,
  'src/unauthorized-secondary-commit.ts']};
 assert.throws(()=>verifyB0Architecture(invalid),/Only tactical posing and offline Workbench/);
});
