import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 C0_BASELINE,C0_OWNERS,C0_MODE_MATRIX,C0_ACCEPTANCE_TESTS,
 classifyC0Line,inspectC0,verifyC0,formatC0Markdown
} from '../scripts/verification/package-c0-presentation-audit.mjs';

let cached;
const report=()=>cached??=inspectC0();

test('C0 fixes source revision and documents the actual scene/view ownership surfaces',()=>{
 const a=report();
 assert.equal(a.baseline,C0_BASELINE);
 assert.equal(a.schema,1);
 assert.ok(a.sourceTypeScriptFiles>100);
 assert.equal(Object.keys(C0_OWNERS).length,19);
 assert.equal(a.keyModules.length,19);
 assert.deepEqual(a.missing,[]);
 assert.ok(C0_ACCEPTANCE_TESTS.length>=8);
 assert.ok(a.keyModules.every(x=>x.sha256.length===64&&x.lines>0));
});

test('C0 validates the existing 3D/2D/fog/world/replay separation without inventing another controller',()=>{
 const a=report(),result=verifyC0(a);
 assert.ok(result.checkedBoundaries>=12);
 for(const k of ['composition3d','composition2d','scene3dClass',
  'sceneUsesSessionGeometry','sceneUsesMaterialLifetime','sharedFog3d',
  'sharedFog2d','sessionWorldRegistration','explicitPresentationAdoption',
  'replayPresentationCoordinator'])assert.equal(a.checks[k],true,k);
});

test('C0 includes independent Studio/Lab preview contexts and five view families',()=>{
 const modes=Object.entries(C0_MODE_MATRIX);
 assert.equal(modes.length,5);
 assert.ok(C0_MODE_MATRIX['Operator Studio'].includes('studioLighting'));
 assert.ok(C0_MODE_MATRIX['Replay / director / bodycam'].includes('replayCamera'));
 for(const [,owners] of modes)
  assert.ok(owners.every(x=>x in C0_OWNERS));
});

test('C0 heuristic candidates are clearly distinguished from actual ownership or leaks',()=>{
 assert.deepEqual(classifyC0Line('const renderer=new THREE.WebGLRenderer({});'),
  ['renderer-construction']);
 assert.deepEqual(classifyC0Line('target.dispose();'),['disposal-call']);
 assert.deepEqual(classifyC0Line('rig.visible=false;'),['visibility-write']);
 assert.deepEqual(classifyC0Line('const x=rig.visible;'),[]);
 assert.deepEqual(classifyC0Line('scene.material=other;'),['material-assignment']);
 assert.deepEqual(classifyC0Line('requestAnimationFrame(frame)'),['frame-scheduler']);
 assert.deepEqual(classifyC0Line('window.addEventListener("resize",fn)'),['ambient-global-candidate']);
 const a=report();
 assert.ok(a.topCandidates.length>0);
 assert.ok((a.candidateCounts['disposal-call']??0)>0);
 assert.ok(a.interpretation.includes('review candidates'));
 assert.ok(a.interpretation.includes('Distinct Lab/Studio renderers'));
});

test('C0 contract checker fails closed when required ownership boundaries drift',()=>{
 const a=report();
 assert.throws(()=>verifyC0({...a,checks:{...a.checks,sharedFog2d:false}}),
  /sharedFog2d/);
 assert.throws(()=>verifyC0({...a,missing:['src/breach-3d.ts']}),
  /baseline surfaces missing/);
 assert.throws(()=>verifyC0({...a,keyModules:a.keyModules.slice(1)}));
});

test('C0 generated report is stable and contains source digests and physical-device caveats',()=>{
 const md=formatC0Markdown(report());
 assert.equal(md,formatC0Markdown(report()));
 assert.match(md,/Package C0 — Reproducible presentation ownership census/);
 assert.match(md,/src\/breach-3d\.ts/);
 assert.match(md,/src\/breach-2d-visibility-renderer\.ts/);
 assert.match(md,/src\/breach-presentation-world-ownership\.ts/);
 assert.match(md,/SHA-256/);
 assert.match(md,/Manual gates/);
 assert.match(md,/iPhone Safari/);
 assert.match(md,/review candidates only/);
});

test('C0 is read-only; CI must generate evidence and retain inherited gates',()=>{
 const ci=readFileSync(new URL('../.github/workflows/package-c-presentation-baseline.yml',import.meta.url),'utf8');
 assert.match(ci,/package-c0-presentation-audit\.mjs --check/);
 assert.match(ci,/package-c0-presentation-audit\.test\.mjs/);
 assert.match(ci,/upload-artifact@v4/);
 assert.match(ci,/artifacts\/package-c0/);
 const a=report();
 assert.ok(a.inheritedAuditTools.includes('scripts/verification/consolidation-inventory.mjs'));
 assert.ok(a.inheritedAuditTools.includes('scripts/verification/package-b0-pose-audit.mjs'));
 assert.ok(a.acceptanceTests.includes('tests/breach-scene-memory-lifecycle-p6.test.mjs'));
});
