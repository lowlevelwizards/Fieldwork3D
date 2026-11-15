/** E0: read-only, reproducible consolidation evidence.
 * Reuse A0 reachability and C0 presentation ownership; never delete from
 * static candidates or infer browser FPS from source tokens or CI CPU.
 * Usage: node scripts/verification/refactor-e0-audit.mjs --check --out artifacts/refactor-e0
 */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname,relative,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {scanRepository} from './consolidation-inventory.mjs';
import {inspectC0,verifyC0,C0_OWNERS,C0_MODE_MATRIX} from './package-c0-presentation-audit.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const E0_START_SHA='f2d91d2be2865d7e76cbc8208adc5b6d4586e609';
export const E0_AREAS=Object.freeze([
 {id:'E0.01',name:'Reuse baseline tools',impact:5,ease:5,owner:'scripts/verification/consolidation-inventory.mjs',next:'Freeze exact commit, reachability classifications and source owner contracts'},
 {id:'E0.02',name:'CI and workflow consolidation',impact:5,ease:4,owner:'.github/workflows/ci.yml',next:'Remove proven redundant branch-name exceptions without weakening affected-domain tests'},
 {id:'E0.03',name:'CSS cascade and responsive policy',impact:4,ease:5,owner:'src/breach-style.css',next:'Review duplicate selector + same context candidates with visual diff'},
 {id:'E0.04',name:'UI refresh and view-state cost',impact:4,ease:4,owner:'src/breach-main.ts',next:'Measure DOM mutations and isolate unchanged child updates'},
 {id:'E0.05',name:'Dependency and authority ownership',impact:4,ease:4,owner:'src/breach-world-context.ts',next:'Classify cycles and avoid second simulation or world owner'},
 {id:'E0.06',name:'Simulation and physical routes',impact:5,ease:3,owner:'src/breach-motor-route.ts',next:'Profile route writer reasons and D3.18 independent held-out loop'},
 {id:'E0.07',name:'Rendering and resource lifetime',impact:5,ease:3,owner:'src/breach-3d.ts',next:'Compare per-frame static disclosure vs camera/actor dirty state'},
 {id:'E0.08',name:'Operator and weapon visual contracts',impact:4,ease:3,owner:'src/operator-helmet-effective-appearance.ts',next:'Compare existing resolved appearance and weapon layout across views'},
 {id:'E0.09',name:'Replay recording and memory',impact:5,ease:2,owner:'src/breach-replay.ts',next:'Benchmark retained memory, GC and seek over growing rounds'},
 {id:'E0.10',name:'Legacy and potential dead code',impact:3,ease:4,owner:'scripts/verification/consolidation-inventory.mjs',next:'Verify deep links, Labs and historical replay before removing anything'},
 {id:'E0.11',name:'World generation and campaign boundaries',impact:3,ease:3,owner:'src/campaign-state.ts',next:'Classify architectural/worldgen and campaign dependency cycles'},
 {id:'E0.12',name:'Integration and safe release handoff',impact:5,ease:3,owner:'scripts/verification/ci-regression-plan.mjs',next:'Accept E1 changes only with fingerprints, source evidence and rollback gates'}
]);
export const E0_INVARIANTS=Object.freeze([
 ['fixed clock','src/breach-simulation-phases.ts','SIMULATION_PHASE_SEQUENCE'],
 ['session geometry','src/breach-world-context.ts','sessionWorldGeometry'],
 ['physical route transition','src/breach-route-transition.ts','setTransientRoute'],
 ['world-swept clearance','src/breach-navigation.ts','sweptBodyClear'],
 ['replay outcome','src/breach-replay.ts','class MissionRecorder'],
 ['live scene','src/breach-3d.ts','class TacticalScene3D'],
 ['pose output','src/breach-operator-animation-controller.ts','poseOperator'],
 ['weapon-family contract','src/equipment-weapon-families.ts','FAMILY_PART_SLOTS']
]);
const filesOf=(root=ROOT,sub='')=>{
 const output=[];
 const visit=(p)=>{
  const dir=join(root,p);
  if(!existsSync(dir))return;
  for(const e of readdirSync(dir,{withFileTypes:true})){
   if(e.isDirectory()){
    if(!new Set(['.git','node_modules','dist','artifacts','coverage','.cache']).has(e.name))
     visit(join(p,e.name));
   }else if(e.isFile())output.push(join(p,e.name).split('\\').join('/'));
  }
 };
 visit(sub);
 return output.sort();
};
const file=(path,root=ROOT)=>readFileSync(join(root,path),'utf8');
const linesMatching=(source,pattern,max=20)=>{
 const result=[];
 source.split(/\r?\n/).forEach((line,index)=>{
  if(pattern.test(line)&&result.length<max)
   result.push({line:index+1,text:line.trim().slice(0,150)});
 });
 return result;
};
export function cssCandidates(source){
 // Lexical selector audit, not a CSS cascade simulator. Track nested
 // @media/@supports contexts and compare only selectors inside the SAME
 // context. Commas, specificity, source order and browser support still
 // need visual validation before any production CSS is changed.
 const withoutComments=source.replace(/\/\*[\s\S]*?\*\//g,'');
 const blocks=[];
 const stack=[];
 let cursor=0;
 const tokens=/([^{}]*)([{}])/g;
 let token;
 while((token=tokens.exec(withoutComments))){
  const fragment=token[1].trim();
  const brace=token[2];
  if(brace==='{'){
   const isRule=!!fragment&&!fragment.startsWith('@');
   const context=stack.filter(x=>x.at).map(x=>x.head).join(' / ');
   const record=isRule?{selector:fragment.replace(/\s+/g,' '),context,
      declarations:[],offset:cursor}:null;
   if(record)blocks.push(record);
   stack.push({head:fragment,at:fragment.startsWith('@'),record});
  }else{
   const active=stack.at(-1);
   if(active?.record){
    active.record.declarations=fragment.split(';').map(x=>x.trim()).filter(Boolean);
   }
   stack.pop();
  }
  cursor=token.index+token[0].length;
 }
 const grouped=new Map();
 for(const item of blocks){
  const key=item.context+'|'+item.selector;
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(item);
 }
 const repeated=[...grouped].filter(([,v])=>v.length>1)
  .map(([key,items])=>({
   selector:items[0].selector,context:items[0].context,occurrences:items.length,
   exactRepeatedDeclarations:items.reduce((count,b,i)=>{
    if(i===0)return count;
    const seen=new Set(items.slice(0,i).flatMap(x=>x.declarations));
    return count+b.declarations.filter(x=>seen.has(x)).length;
   },0)
  })).sort((a,b)=>b.occurrences-a.occurrences||
    a.selector.localeCompare(b.selector));
 return {
  ruleCount:blocks.length,
  sameContextRepeatedSelectors:repeated.length,
  exactRepeatedDeclarations:repeated.reduce((sum,x)=>sum+x.exactRepeatedDeclarations,0),
  mediaQueries:(source.match(/@media\b/g)||[]).length,
  importantDeclarations:(source.match(/!important\b/g)||[]).length,
  candidates:repeated.slice(0,60),
  caveat:'Lexical duplicates are REVIEW candidates; media specificity, cascade and visual behavior are not proven.'
 };
}
export function workflowCensus(workflows){
 const testUses=new Map();
 const rows=workflows.map(({path,source})=>{
  const matches=[...source.matchAll(/tests\/[\w./-]+\.test\.mjs/g)].map(x=>x[0]);
  for(const test of new Set(matches)){
   if(!testUses.has(test))testUses.set(test,new Set());
   testUses.get(test).add(path);
  }
  return {path,lines:source.split(/\r?\n/).length,
   testReferences:matches.length,
   branchSpecificGuards:(source.match(/github\.head_ref\s*==/g)||[]).length,
   pathTrigger:/^\s+paths:\s*$/m.test(source),
   manual:/workflow_dispatch\s*:/m.test(source),
   pullRequest:/pull_request\s*:/m.test(source),
   push:/^\s+push:\s*$/m.test(source)};
 });
 const duplicates=[...testUses].filter(([,v])=>v.size>1)
   .map(([test,v])=>({test,workflows:[...v].sort()}))
   .sort((a,b)=>b.workflows.length-a.workflows.length||a.test.localeCompare(b.test));
 return {workflowCount:rows.length,branchGuardCount:rows.reduce((s,x)=>s+x.branchSpecificGuards,0),
  repeatedTestReferences:duplicates.length,
  workflows:rows,topOverlap:duplicates.slice(0,35),
  caveat:'A repeated test in independent workflows is not automatically redundant; specialized CI may be required.'};
}
export function inspectE0(root=ROOT,{inventory,presentation}={}){
 const all=filesOf(root),existing=new Set(all);
 const get=p=>existing.has(p)?file(p,root):'';
 const head=()=>{try{return execFileSync('git',['rev-parse','HEAD'],
   {cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
   catch{return null;}};
 const a0=inventory??scanRepository(root);
 const c0=presentation??inspectC0(root);
 verifyC0(c0); // Protect C0's existing cross-view/geometry contracts.
 const cssPaths=all.filter(x=>x.startsWith('src/')&&x.endsWith('.css'));
 const css=cssPaths.map(path=>({path,...cssCandidates(get(path))}))
  .sort((a,b)=>b.sameContextRepeatedSelectors-a.sameContextRepeatedSelectors||
    a.path.localeCompare(b.path));
 const workflows=workflowCensus(all.filter(p=>p.startsWith('.github/workflows/')&&
   /\.ya?ml$/.test(p)).map(path=>({path,source:get(path)})));
 const sourcePaths=all.filter(p=>p.startsWith('src/')&&/\.(ts|tsx)$/.test(p));
 const hotPaths=[
  'src/breach-runtime-loop.ts','src/breach-3d.ts','src/breach-main.ts',
  'src/operator-studio.ts','src/ui/tactical-hud-controller.ts',
  'src/breach-game.ts','src/breach-replay.ts','src/breach-motor-route.ts',
  'src/breach-motor-collision.ts','src/breach-passage.ts',
  'src/breach-simulation-phases.ts','src/operator-headwear-camo.ts'
 ];
 const patterns={
  arrays:/\.(?:filter|map|sort|flatMap)\(/,
  raf:/requestAnimationFrame\(/,
  materialRecompile:/\.needsUpdate\s*=\s*true/,
  dom:/\b(?:replaceChildren|createElement|innerHTML|addEventListener)\b/,
  gpuDisposal:/\.dispose\(/,
  route:/\b(?:routeWithSqueezeWorld|setTransientRoute|recover|replan|cachedEnemyRoute)\b/
 };
 const hotspots=hotPaths.map(path=>{
  const source=get(path);const signals={};
  for(const [name,re] of Object.entries(patterns))
   signals[name]=linesMatching(source,re,12);
  return {path,lines:source.split(/\r?\n/).length,signals};
 });
 const uiPaths=['src/breach-main.ts','src/operator-studio.ts',
  'src/ui/tactical-hud-controller.ts','src/ui/breach-replay-hud-controller.ts',
  'src/ui/breach-after-action-controller.ts','src/campaign-ui.ts'];
 const ui=uiPaths.map(path=>({path,
  refresh:linesMatching(get(path),/\b(?:updateHud|renderSession|replaceChildren|refresh\(|syncMissionPhase)\b/,20),
  lifecycle:linesMatching(get(path),/\b(?:addEventListener|removeEventListener|dispose\(|cancelAnimationFrame)\b/,15)}));
 const contracts=E0_INVARIANTS.map(([name,path,marker])=>({
  name,path,marker,exists:existing.has(path),matched:get(path).includes(marker)
 }));
 const tests=all.filter(p=>/^tests\/.*\.test\.mjs$/.test(p));
 const ports={
  main:all.filter(p=>/^[^/]+\.html$/.test(p)),
  releaseWorkflow:' .github/workflows/pages.yml'.trim(),
  productionStamp:get('.github/workflows/pages.yml').includes('Verify public Pages serves expected build')
 };
 const physicalEvidence={
  source:'https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/43758824857',
  sourceSha:'f05ed217ce953dd05455647e16180e723123e8b8',
  frozen22:{arrivals:140,completedSquads:29,loops:0,searches:28918,routeCpuMs:137538.08},
  historical11:{arrivals:80,completedSquads:18,loops:0,searches:2562,routeCpuMs:9095.91},
  fresh22:{arrivals:146,completedSquads:29,loops:1,searches:27275,routeCpuMs:81663.58},
  caveat:'Historical CI offline CPU totals; not frame time, not device GPU time. Fresh cohort has one suspected loop; successful job did not reject it.'
 };
 const problems=[];
 for(const contract of contracts)if(!contract.matched)
  problems.push('Missing E0 authority '+contract.name+' ('+contract.path+')');
 if(!ports.productionStamp)problems.push('Release stamp verification is missing');
 if(a0.commit&&head()&&a0.commit!==head())
  problems.push('Stale A0 inventory commit '+a0.commit+' vs '+head());
 return {
  schema:1,startSha:E0_START_SHA,headSha:head(),readOnly:true,
  census:{allFiles:all.length,typescript:sourcePaths.length,tests:tests.length,
   css:cssPaths.length,workflows:workflows.workflowCount,htmlEntries:ports.main.length,
   sourceBytes:sourcePaths.reduce((s,p)=>s+Buffer.byteLength(get(p)),0)},
  ownership:{c0Owners:c0.keyModules,modes:C0_MODE_MATRIX,contracts,
   cycles:a0.cycles,topDependencies:a0.topDependencies,
   inventoryCounts:a0.counts,
   compatibility:{unreferenced:a0.classifications.unreferenced,
    testOnly:a0.classifications.testOnly,toolOnly:a0.classifications.toolOnly,
    typeReferenced:a0.classifications.typeReferenced,
    uncertainDynamic:a0.uncertainDynamic,unresolved:a0.unresolvedLocalReferences}},
  presentation:{c0Checks:c0.checks,c0Candidates:c0.candidateCounts},
  css:{files:css},
  ui:{files:ui,caveat:'Static update markers do not prove redundant DOM writes; browser profiling is required.'},
  verification:{...workflows,ciSelector:'scripts/verification/ci-regression-plan.mjs',
   architectureGate:'scripts/verification/breach-critical-suite.mjs',
   release:ports.releaseWorkflow,productionStamp:ports.productionStamp},
  hotspots:{files:hotspots,caveat:'Source signals, not timings; benchmark and same-device GPU verification needed.'},
  behavior:{physicalEvidence,
   acceptance:[
    'fixed 60Hz phase order and authored GO preserved',
    'D3.18 historical11, frozen22 and fresh22 real motor corpora',
    '70 and mirrored 168 passage physics and door pressure',
    'friendly/civilian fire safety and observed LOS',
    '2D/3D fog and replay personal historical disclosure',
    'Studio and Operator Lab matched views and scene disposal',
    '20Hz outcome frames, motion journal and completeness flags',
    'long-round heap/GC and RAF on real hardware',
    'campaign, wardrobe, weapon presets and previous save formats',
    'Pages exact served commit stamp and iPhone Safari manual gate'
   ],
   commands:[
    'node scripts/verification/breach-critical-suite.mjs',
    'node --experimental-strip-types scripts/audit-passage-q5.mjs --release-a --extended --strict',
    'npm run bench:round-lifetime -- --seconds=180',
    'npm run bench:operator-pose',
    'npm run build'
   ],
   caveat:'Commands are acceptance guidance, not claimed to have run during read-only E0 generation.'},
  priorities:E0_AREAS,problems,
  notes:[
   'Do not delete unreferenced, type-only or test-only source based on static analysis.',
   'Do not introduce new actor motor, replay authority, UI controller or renderer.',
   'Verify CSS candidates within identical conditional context and with browser visual diffs.',
   'Treat E1-E3 as separately reviewed, tested and released implementation stages.'
  ]
 };
}
export function verifyE0(report){
 assert.equal(report.schema,1);
 assert.ok(report.census.typescript>100,'Incomplete TS source census');
 assert.ok(report.census.tests>100,'Incomplete test census');
 assert.ok(report.census.workflows>0,'No workflows found');
 assert.equal(report.priorities.length,12);
 assert.deepEqual(report.problems,[],report.problems.join('; '));
 assert.equal(report.readOnly,true);
 return true;
}
export function formatE0(report){
 const rows=report.priorities.map(p=>'| '+p.id+' | '+p.name+' | '+p.impact+
  '/5 | '+p.ease+'/5 | '+p.next+' |');
 const css=report.css.files.slice(0,8).map(c=>'| '+c.path+' | '+
  c.sameContextRepeatedSelectors+' | '+c.exactRepeatedDeclarations+' | '+
  c.importantDeclarations+' |');
 return [
  '# E0 — Current Consolidation Evidence and E1–E3 Handoff','',
  'Source head: '+(report.headSha??'source archive')+'; starting D3.18 main: '+report.startSha+'.',
  'Read-only: yes. None of the listed optimization candidates is an implemented speedup.','',
  '## Source and verification census','',
  '- TypeScript source: '+report.census.typescript+'; tests: '+report.census.tests+
   '; CSS files: '+report.census.css+'; workflows: '+report.census.workflows+'.',
  '- A0 reachability: '+report.ownership.inventoryCounts.runtimeReachable+
   ' runtime, '+report.ownership.inventoryCounts.unreferenced+
   ' unreferenced *candidates*.',
  '- Existing C0 presentation owners: '+report.ownership.c0Owners.length+'.',
  '- Workflow branch-specific equality guards: '+report.verification.branchGuardCount+'.',
  '- Test files referenced from multiple workflows: '+report.verification.repeatedTestReferences+'.',
  '- C0 and E0 deterministic contracts: '+report.ownership.contracts.length+'.','',
  '## Ranked audited packages','',
  '| Stage | Area | Impact | Ease | Next measured implementation question |',
  '|---|---|---:|---:|---|',...rows,'',
  '## CSS review candidates (same conditional context only)','',
  '| File | Repeated selector groups | Exact repeated declarations | !important |',
  '|---|---:|---:|---:|',...css,'',
  'Never delete CSS based on a lexical hit without cascade and viewport comparisons.','',
  '## Existing physical behavior anchor','',
  'D3.18 PR CI: '+report.behavior.physicalEvidence.source,
  'Historical 11 sites: 80 arrivals, 18 squads, zero loops; frozen 22 sites: '+
   '140 arrivals, 29 squads, zero loops; new 22 sites: 146 arrivals, 29 squads, '+
   'one suspected loop. CPU totals measure offline route work, not FPS.','',
  '## Architectural protection','',
  ...report.ownership.contracts.map(c=>'- '+c.name+': '+c.path),
  '', '## Known uncertainty and non-goals','',
  ...report.notes.map(x=>'- '+x),'',
  '## Acceptance gates for E1–E3','',
  ...report.behavior.acceptance.map(x=>'- '+x),
  '', 'Suggested commands (not run by this E0 generator):',
  ...report.behavior.commands.map(x=>'- '+x),
  '', 'Evidence files: baseline.json, ownership.json, hotspots.json, ui-css.json, verification.json, audit.json.',
  'E0 is a read-only inventory. Runtime refactors require separate exact-head test and Pages checkpoints.',''
 ].join('\n');
}
export function writeE0(report,out){
 mkdirSync(out,{recursive:true});
 const json=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n');
 json('audit.json',report);
 json('baseline.json',{schema:report.schema,startSha:report.startSha,
  headSha:report.headSha,census:report.census,behavior:report.behavior});
 json('ownership.json',report.ownership);
 json('hotspots.json',report.hotspots);
 json('ui-css.json',{css:report.css,ui:report.ui,presentation:report.presentation});
 json('verification.json',report.verification);
 writeFileSync(join(out,'prioritized-backlog.md'),formatE0(report));
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const r=inspectE0();
 if(process.argv.includes('--check'))verifyE0(r);
 const index=process.argv.indexOf('--out');
 if(index!==-1){
  assert.ok(process.argv[index+1]&&!process.argv[index+1].startsWith('--'),
    'Expected directory after --out');
  writeE0(r,resolve(process.argv[index+1]));
 }
 console.log('E0 audit '+JSON.stringify({head:r.headSha,census:r.census,
  problems:r.problems,cssCandidates:r.css.files.reduce(
   (n,c)=>n+c.sameContextRepeatedSelectors,0),
  branchGuards:r.verification.branchGuardCount}));
}
