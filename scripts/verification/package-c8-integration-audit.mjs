/** C8 closeout: reproducible, read-only C0-C8 integration inventory.
 * Does not load a game, allocate a renderer, inspect hidden combatants or
 * assert that a GitHub Actions job proves iPhone Safari thermal stability.
 */
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,writeFileSync}
 from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const stageDocs=[
 'docs/consolidation-package-c-stage0-presentation-baseline.md',
 'docs/consolidation-package-c-stage1-scene-lifecycle.md',
 'docs/consolidation-package-c-stage2-render-composition.md',
 'docs/consolidation-package-c-stage3-cross-view-disclosure.md',
 'docs/consolidation-package-c-stage4-tactical-ui-interactions.md',
 'docs/consolidation-package-c-stage5-replay-director-ownership.md',
 'docs/consolidation-package-c-stage6-world-generation-contracts.md',
 'docs/consolidation-package-c-stage7-mission-faction-semantics.md',
 'docs/consolidation-package-c-stage8-integration-closeout.md'
];
const stageTests=Array.from({length:9},(_,i)=>
 i===0?'tests/package-c0-presentation-audit.test.mjs':
 i===1?'tests/package-c1-scene-lifecycle.test.mjs':
 i===2?'tests/package-c2-render-composition.test.mjs':
 i===3?'tests/package-c3-cross-view-disclosure.test.mjs':
 i===4?'tests/package-c4-tactical-ui-consolidation.test.mjs':
 i===5?'tests/package-c5-replay-view-ownership.test.mjs':
 i===6?'tests/package-c6-world-geometry-contract.test.mjs':
 i===7?'tests/package-c7-mission-faction-semantics.test.mjs':
 'tests/package-c8-integration-closeout.test.mjs');
const workflow='.github/workflows/package-c-presentation-baseline.yml';
const owners=[
 'src/breach-main.ts',
 'src/breach-3d.ts',
 'src/breach-2d-world-renderer.ts',
 'src/breach-2d-actor-renderer.ts',
 'src/breach-2d-visibility-renderer.ts',
 'src/breach-world-context.ts',
 'src/breach-presentation-world-ownership.ts',
 'src/rendering/site-scene-lifecycle.ts',
 'src/rendering/breach-site-render-composition.ts',
 'src/rendering/breach-3d-disclosure-presenter.ts',
 'src/ui/tactical-command-affordances.ts',
 'src/ui/breach-replay-hud-controller.ts',
 'src/rendering/breach-fog-mesh-composition.ts',
 'src/worldgen/window-geometry-contract.ts',
 'src/breach-mission-semantics.ts',
 'src/breach-session-factory.ts',
 'src/briefing/mission-facts.ts',
 'src/worldgen/encounter-director.ts',
 'src/breach-replay-manifest.ts'
];
const rules=[
 ['session-site-isolation','src/breach-session-factory.ts',
  'registerSessionWorldGeometry(state)'],
 ['mission-selector','src/breach-session-factory.ts',
  'missionType:resolveMissionKind(site,missionOverride,encounterContext.mission)'],
 ['encounter-seed-policy','src/worldgen/encounter-director.ts',
  'missionForSeed(site.seed)'],
 ['actual-population-briefing','src/briefing/mission-facts.ts',
  'resolvedMissionPopulation(s)'],
 ['site-lifecycle','src/breach-3d.ts','releaseSiteSceneObjects'],
 ['scene-composition','src/breach-3d.ts','composeBreachSiteRender'],
 ['3d-actor-disclosure','src/breach-3d.ts','presentActor('],
 ['2d-actor-disclosure','src/breach-2d-actor-renderer.ts','presentActor('],
 ['2d-physical-windows','src/breach-2d-world-renderer.ts',
  'windowApertureSegment(opening)'],
 ['replay-world-truth','src/breach-replay-manifest.ts',
  'site:preservedSite!==undefined?preservedSite:'],
 ['c7-semantic-audit','src/breach-mission-semantics.ts','auditMissionScenario('],
 ['c8-inherited-regressions',workflow,
  'tests/package-c8-integration-closeout.test.mjs'],
 ['c8-offline-evidence',workflow,
  'package-c8-integration-audit.mjs --check']
];
const read=p=>readFileSync(resolve(root,p),'utf8');
export function inspectPackageC(){
 const needed=[...stageDocs,...stageTests,...owners,workflow,
  'scripts/verification/package-c7-mission-semantics-audit.mjs',
  'scripts/verification/package-c8-integration-audit.mjs'];
 const missing=[...new Set(needed)].filter(p=>!existsSync(resolve(root,p)));
 const boundaries=rules.map(([key,path,marker])=>({
  key,owner:path,ok:!missing.includes(path)&&read(path).includes(marker)
 }));
 const ownerDigests=owners.filter(p=>!missing.includes(p)).map(path=>({
  path,sha256:createHash('sha256').update(read(path)).digest('hex'),
  lines:read(path).split('\n').length
 }));
 return {
  schema:1,package:'C',scope:'static ownership + stage handoff',
  stages:stageDocs.map((document,i)=>({
   stage:'C'+i,document,test:stageTests[i],
   exists:!missing.includes(document)&&!missing.includes(stageTests[i])
  })),
  owners:owners.length,ownerDigests,boundaries,missing,
  inheritedCritical:['3D lifecycle','2D world & fog','replay historical disclosure',
   'tactical UI','world geometry','mission/faction and restart',
   'Studio/Lab GPU acceptance','production typecheck and build'],
  limits:'Static source evidence is not proof of real-device FPS, thermal load or served Pages SHA.'
 };
}
export function verifyPackageC(report){
 if(report.missing.length)throw Error('C8 missing required files: '+report.missing.join(', '));
 for(const item of report.boundaries)if(!item.ok)
  throw Error('C8 ownership regression: '+item.key+' ('+item.owner+')');
 if(report.stages.some(s=>!s.exists))
  throw Error('C8 missing stage regression coverage');
 if(report.ownerDigests.length!==report.owners)
  throw Error('C8 missing ownership digest');
 return report;
}
export function formatPackageC(report){
 return [
  '# Package C8 — Integration & Closeout Evidence','',
  'Scope: C0–C8, source ownership and critical verification handoffs.','',
  '## Stage inventory','',
  ...report.stages.map(s=>'- '+s.stage+': '+s.document+'; '+s.test),
  '','## Ownership contract','',
  ...report.boundaries.map(c=>'- '+(c.ok?'PASS':'FAIL')+' '+c.key+
   ' — '+c.owner),
  '','## Source digests (SHA-256)','',
  ...report.ownerDigests.map(o=>'- '+o.path+': '+o.sha256),
  '','## Manual release gates','',
  '- Verify that the prior GitHub Pages build is served at the public URL.',
  '- Verify the exact new merge SHA and public build stamp after deploying.',
  '- Check physical iPhone Safari and long-session/thermal behavior manually.',
  '- CI does not certify subjective visual parity or hardware stability.','',
  report.limits,''
 ].join('\n');
}
const invoked=process.argv[1]&&
 resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const report=inspectPackageC();
 if(process.argv.includes('--check'))verifyPackageC(report);
 const target=(flag)=>process.argv[process.argv.indexOf(flag)+1];
 const write=(flag,content)=>{
  if(!process.argv.includes(flag))return;
  const path=resolve(process.cwd(),target(flag));
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,content);
 };
 write('--json',JSON.stringify(report,null,2)+'\n');
 write('--markdown',formatPackageC(report));
 console.log('C8: '+report.stages.length+' stages, '+report.ownerDigests.length+
  ' owners, '+report.boundaries.filter(x=>x.ok).length+'/'+
  report.boundaries.length+' contract boundaries verified');
}
