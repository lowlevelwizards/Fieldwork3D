/** Package C0 — read-only scene/presentation architecture census.
 * Textual hotspots are candidates, not evidence of duplicate ownership.
 * Reuses A0 reachability and B0 pose audits rather than replacing them.
 * No runtime code, rendering context, simulation state, or graphics imports.
 *
 * node scripts/verification/package-c0-presentation-audit.mjs --check
 * node scripts/verification/package-c0-presentation-audit.mjs --check \
 *   --json artifacts/package-c0/audit.json \
 *   --markdown artifacts/package-c0/audit.md
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

export const C0_BASELINE='4e47f2c78b06dd3bf79b1ec5768084efe1530ef1';
const DEFAULT_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const C0_OWNERS=Object.freeze({
 composition:{owner:'src/breach-main.ts',role:'Application composition; allocates 2D renderers and live 3D scene; not Session authority'},
 tactical3d:{owner:'src/breach-3d.ts',role:'TacticalScene3D scene/camera, live and replay presentation, visual update/disposal'},
 worldBuilder:{owner:'src/rendering/breach-site-scene-builder.ts',role:'Site meshes and static batch construction'},
 materials:{owner:'src/rendering/site-material-lifetime.ts',role:'Site material disposal lifetime helper'},
 shadow:{owner:'src/rendering/breach-shadow-controller.ts',role:'Stationary shadow update throttling'},
 floorPlan:{owner:'src/breach-2d-world-renderer.ts',role:'2D world and frame composition'},
 floorActors:{owner:'src/breach-2d-actor-renderer.ts',role:'2D actor presentation'},
 floorFog:{owner:'src/breach-2d-visibility-renderer.ts',role:'Floor Plan fog canvas and replay personal-ground mask'},
 fogFingerprint:{owner:'src/breach-fog-cache.ts',role:'Shared 2D/3D presentation fog invalidation fingerprint'},
 fogPolicy:{owner:'src/breach-fog-domain.ts',role:'Exterior fog display domain, not sight authority'},
 worldAuthority:{owner:'src/breach-world-context.ts',role:'Session-owned world geometry and spatial queries'},
 worldAdapter:{owner:'src/breach-presentation-world-ownership.ts',role:'Explicit adoption of Session geometry for legacy presentation consumers'},
 graphicLighting:{owner:'src/breach-graphic-world-lighting.ts',role:'World graphic material grading'},
 studioLighting:{owner:'src/operator-studio-lighting.ts',role:'Studio light/shadow rig and presentation policy'},
 studioPreview:{owner:'src/operator-studio.ts',role:'Standalone Studio preview renderer/camera'},
 operatorLab:{owner:'src/breach-operator-lab.ts',role:'Standalone Operator Lab preview renderer/camera'},
 previewDisposal:{owner:'src/operator-preview-rig-lifecycle.ts',role:'Temporary preview rig removal/disposal'},
 replayView:{owner:'src/breach-replay-presentation-controller.ts',role:'Replay presentation coordination and invalidation'},
 replayCamera:{owner:'src/breach-replay-camera-controller.ts',role:'Replay camera mode and framing coordination'}
});
export const C0_MODE_MATRIX=Object.freeze({
 'Tactical 3D / isometric':['composition','tactical3d','worldBuilder','materials','shadow','fogFingerprint','worldAuthority','worldAdapter','graphicLighting'],
 'Floor Plan 2D':['composition','floorPlan','floorActors','floorFog','fogFingerprint','worldAuthority'],
 'Replay / director / bodycam':['tactical3d','replayView','replayCamera','floorFog','fogFingerprint','worldAuthority'],
 'Operator Studio':['studioPreview','studioLighting','previewDisposal'],
 'Operator Lab':['operatorLab','previewDisposal','studioLighting']
});
export const C0_ACCEPTANCE_TESTS=Object.freeze([
 'tests/breach-scene-memory-lifecycle-p6.test.mjs',
 'tests/breach-site-material-lifetime.test.mjs',
 'tests/breach-scene-frame-p7.test.mjs',
 'tests/breach-2d-renderer-extraction.test.mjs',
 'tests/breach-fog-visibility.test.mjs',
 'tests/consolidation-stage8-world-ownership.test.mjs',
 'tests/breach-roadmap2-stage4-replay-presentation.test.mjs',
 'tests/replay-camera-controller-20261109.test.mjs',
 'tests/operator-lab-unified-poses.test.mjs'
]);
const normalize=s=>s.replaceAll('\\','/');
const hash=s=>createHash('sha256').update(s).digest('hex');
function scanSource(root){
 const entries=[];
 function visit(dir){
  for(const e of readdirSync(resolve(root,dir),{withFileTypes:true})){
   const p=normalize(join(dir,e.name));
   if(e.isDirectory())visit(p);
   else if(e.isFile()&&/\.(ts|tsx|js|jsx)$/.test(e.name))entries.push(p);
  }
 }
 visit('src');
 return entries.sort();
}
export function classifyC0Line(line){
 const result=[];
 // Heuristic candidates: strings/comments and separate preview contexts can
 // appear here. Not proof of an allocation, race, leak, or competing writer.
 if(/\bnew\s+THREE\.WebGLRenderer\s*\(/.test(line))result.push('renderer-construction');
 if(/\bnew\s+THREE\.WebGLRenderTarget\s*\(/.test(line))result.push('render-target');
 if(/\.dispose\s*\(/.test(line))result.push('disposal-call');
 if(/\.visible\s*=/.test(line))result.push('visibility-write');
 if(/\.material\s*=/.test(line))result.push('material-assignment');
 if(/\brequestAnimationFrame\s*\(/.test(line))result.push('frame-scheduler');
 if(/\b(?:window|globalThis)\.[A-Za-z_$]/.test(line))result.push('ambient-global-candidate');
 return result;
}
export function inspectC0(root=DEFAULT_ROOT){
 const required=[...new Set([...Object.values(C0_OWNERS).map(v=>v.owner),...C0_ACCEPTANCE_TESTS,
  'breach.html','operator-studio.html','operator-lab.html','scripts/verification/consolidation-inventory.mjs',
  'scripts/verification/package-b0-pose-audit.mjs'])];
 const missing=required.filter(p=>!existsSync(resolve(root,p)));
 const paths=scanSource(root),source=new Map();
 for(const p of paths)source.set(p,readFileSync(resolve(root,p),'utf8'));
 const get=p=>source.get(p)??'';
 const checks={
  composition3d:/\bTacticalScene3D\b/.test(get('src/breach-main.ts')),
  composition2d:/\bcreateBreach2DWorldRenderer\b/.test(get('src/breach-main.ts')),
  scene3dClass:/\bexport class TacticalScene3D\b/.test(get('src/breach-3d.ts')),
  sceneUsesSessionGeometry:/\bsessionWorldGeometry\b/.test(get('src/breach-3d.ts')),
  sceneUsesMaterialLifetime:/\bSiteMaterialLifetime\b/.test(get('src/breach-3d.ts')),
  floorPlanFactory:/\bexport function createBreach2DWorldRenderer\b/.test(get('src/breach-2d-world-renderer.ts')),
  floorFogFactory:/\bexport function createBreach2DVisibilityRenderer\b/.test(get('src/breach-2d-visibility-renderer.ts')),
  sharedFog3d:/\bfogSessionFingerprint\b/.test(get('src/breach-3d.ts')),
  sharedFog2d:/\bfogSessionFingerprint\b/.test(get('src/breach-2d-visibility-renderer.ts')),
  sessionWorldRegistration:/\bregisterSessionWorldGeometry\b/.test(get('src/breach-world-context.ts')),
  explicitPresentationAdoption:/\badoptPresentationWorldSession\b/.test(get('src/breach-presentation-world-ownership.ts')),
  replayPresentationCoordinator:/\bexport function createBreachReplayPresentationController\b/.test(get('src/breach-replay-presentation-controller.ts')),
  studioLightingClass:/\bexport class OperatorStudioLighting\b/.test(get('src/operator-studio-lighting.ts'))
 };
 const candidates=[],counts={};
 for(const p of paths){
  const hits=[];
  for(const [i,line] of get(p).split(/\r?\n/).entries()){
   const classes=classifyC0Line(line);
   for(const category of classes)counts[category]=(counts[category]??0)+1;
   if(classes.length)hits.push({line:i+1,classes});
  }
  if(hits.length)candidates.push({path:p,count:hits.reduce((a,v)=>a+v.classes.length,0),
   samples:hits.slice(0,10)});
 }
 candidates.sort((a,b)=>b.count-a.count||a.path.localeCompare(b.path));
 const keyModules=Object.entries(C0_OWNERS).map(([domain,v])=>{
  const data=get(v.owner);
  return {domain,path:v.owner,role:v.role,lines:data?data.split(/\r?\n/).length:0,
   sha256:data?hash(data):null};
 });
 let commit=null;
 try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch{/* archives are allowed */}
 return {schema:1,baseline:C0_BASELINE,commit,
  interpretation:'Textual review candidates only: comments, runtime reflection, codegen, generated resources and device behavior are not proved. Distinct Lab/Studio renderers are expected.',
  sourceTypeScriptFiles:paths.length,missing,checks,
  modes:C0_MODE_MATRIX,keyModules,candidateCounts:counts,topCandidates:candidates.slice(0,40),
  acceptanceTests:C0_ACCEPTANCE_TESTS,
  inheritedAuditTools:['scripts/verification/consolidation-inventory.mjs','scripts/verification/package-b0-pose-audit.mjs'],
  manualGates:['real iPhone Safari and dedicated GPU frame/memory/thermal tests',
   'fog/history disclosure under cross-view replay seeks',
   'visual comparisons at matching seed, camera, equipment and lighting presets']
 };
}
export function verifyC0(report){
 assert.equal(report.schema,1);
 assert.deepEqual(report.missing,[],'C0 required baseline surfaces missing');
 assert.ok(report.sourceTypeScriptFiles>100,'C0 source census was unexpectedly empty');
 for(const [name,valid] of Object.entries(report.checks))
  assert.equal(valid,true,'C0 ownership boundary changed: '+name);
 assert.equal(report.keyModules.length,Object.keys(C0_OWNERS).length);
 for(const item of report.keyModules)
  assert.ok(item.lines>0&&item.sha256?.length===64,'C0 source digest missing: '+item.path);
 for(const [mode,owners] of Object.entries(report.modes)){
  assert.ok(owners.length>0,'Missing C0 mode: '+mode);
  for(const owner of owners)assert.ok(C0_OWNERS[owner],'Unknown C0 owner: '+owner);
 }
 return {checkedBoundaries:Object.keys(report.checks).length,owners:report.keyModules.length};
}
export function formatC0Markdown(report){
 return [
 '# Package C0 — Reproducible presentation ownership census','',
 'Starting main commit: '+report.baseline,
 'Audited tree commit: '+(report.commit??'source archive / unknown'),
 '',
 '> '+report.interpretation,'',
 '## Source and verification coverage','',
 '- Scanned src/ JS and TS files: '+report.sourceTypeScriptFiles,
 '- Explicit owner modules: '+report.keyModules.length,
 '- Inherited targeted regression tests: '+report.acceptanceTests.length,
 '- Checked canonical boundaries: '+Object.keys(report.checks).length,'',
 '## Ownership matrix','',
 '| Domain | Current owner | Responsibility | Source SHA-256 |',
 '|---|---|---|---|',
 ...report.keyModules.map(x=>'| '+x.domain+' | '+x.path+' | '+x.role+' | '+x.sha256+' |'),
 '','## Mode-to-owner references','',
 ...Object.entries(report.modes).map(([k,v])=>'- **'+k+'**: '+v.join(', ')),
 '','## Static hotspot categories (review candidates only)','',
 '| Candidate category | Line matches |','|---|---:|',
 ...Object.entries(report.candidateCounts).sort(([a],[b])=>a.localeCompare(b))
  .map(([k,v])=>'| '+k+' | '+v+' |'),
 '','## Highest-volume candidate files','',
 '| File | Matches |','|---|---:|',
 ...report.topCandidates.slice(0,20).map(x=>'| '+x.path+' | '+x.count+' |'),
 '','## Inherited critical regression files','',
 ...report.acceptanceTests.map(x=>'- '+x),
 '','## Manual gates (not certified by static CI)','',
 ...report.manualGates.map(x=>'- '+x),'',
 'A0 reachability and B0 pose authority are existing audits; C0 intentionally does not duplicate them.',
 ''
 ].join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectC0();
 if(process.argv.includes('--check'))verifyC0(report);
 for(const [flag,data] of [['--json',JSON.stringify(report,null,2)+'\n'],
  ['--markdown',formatC0Markdown(report)]]){
  const i=process.argv.indexOf(flag);
  if(i>=0){
   assert.ok(process.argv[i+1],'Missing output path for '+flag);
   const output=resolve(process.argv[i+1]);
   mkdirSync(dirname(output),{recursive:true});
   writeFileSync(output,data);
  }
 }
 process.stdout.write('C0: '+report.keyModules.length+' owners, '+
  Object.keys(report.checks).length+' boundaries, '+
  report.sourceTypeScriptFiles+' source files; '+report.missing.length+' missing.\n');
}
