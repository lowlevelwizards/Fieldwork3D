/**
 * L1.0: an entirely read-only baseline of the production lighting pipeline.
 *
 * Uses authored K1 geometry and the existing light/LOS/presentation modules.
 * No runtime registration, mutation, switch model, or independent simulator.
 * Run: node --experimental-strip-types scripts/audit-l1-lighting-baseline.mjs
 *      node --experimental-strip-types scripts/audit-l1-lighting-baseline.mjs --check
 *
 * CPU/Node figures are descriptive, NOT a browser/GPU performance gate.
 */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {DEFAULT_TRAINING_CONFIG} from '../src/training/training-courses.ts';
import {planSiteLighting} from '../src/equipment-site-lighting.ts';
import {lightingPresentation} from '../src/equipment-lighting-presentation.ts';
import {illuminationAt,buildIlluminationBlockers,sampleIlluminationGrid}
 from '../src/equipment-light-field.ts';
import {lightBeamFootprint,LIGHT_BEAM_SAMPLES}
 from '../src/equipment-weapon-light-beam.ts';
import {newSession} from '../src/breach-game.ts';
import {actorLightingLevels,lightVisibilityGain} from '../src/equipment-sight-lighting.ts';

export const L1_BASELINE_MODES=Object.freeze([
 'day','evening','night','blackout','emergency'
]);
export const L1_BASELINE_LAYOUTS=Object.freeze([
 'linear','branch','hall','compound'
]);

/** Shared deterministic scenario for L1.0 and future L1 power regressions.
 * Keep a new site per invocation: Session takes ownership of live objects.
 */
export function l1BaselineSite(layout='compound'){
 if(!L1_BASELINE_LAYOUTS.includes(layout))
  throw new Error('Unknown L1 baseline layout: '+layout);
 return buildTrainingSite({...DEFAULT_TRAINING_CONFIG,
  activity:'killhouse',layout,doors:'closed',targetDensity:'dense',
  lighting:'night'});
}
export function l1BaselineOcclusion(){
 const source={id:'baseline-beam',p:{x:0,y:0},range:80,
  intensity:1,heading:0,halfAngle:.34};
 const point={x:30,y:0};
 const door={id:'L1 TEST LEAF',a:{x:15,y:-20},b:{x:15,y:20},
  open:false,openedAt:-1,kind:'hinged',hinge:'a',style:'wood'};
 const opaque=buildIlluminationBlockers([], [door],[]);
 const glazed=buildIlluminationBlockers([], [{...door,style:'glazed'}],[]);
 const wall=buildIlluminationBlockers([{a:{x:15,y:-20},
  b:{x:15,y:20}}],[],[]);
 return {
  clear:illuminationAt(point,[source],[],0),
  opaque:illuminationAt(point,[source],opaque,0),
  glazed:illuminationAt(point,[source],glazed,0),
  wall:illuminationAt(point,[source],wall,0),
  coneVertices:lightBeamFootprint(source.p,0,opaque).length,
  expectedConeVertices:LIGHT_BEAM_SAMPLES+1
 };
}
export function l1BaselineCensus(){
 const layouts=L1_BASELINE_LAYOUTS.map(layout=>{
  const site=l1BaselineSite(layout);
  return {layout,rooms:site.rooms.length,doors:site.doors.length,
   cover:site.cover.length,
   fixturesByMode:Object.fromEntries(L1_BASELINE_MODES.map(mode=>
    [mode,planSiteLighting(site,mode).fixtures.length]))};
 });
 const site=l1BaselineSite();
 const modes=Object.fromEntries(L1_BASELINE_MODES.map(mode=>{
  const program=planSiteLighting(site,mode);
  const appearance=lightingPresentation(mode);
  const ids=program.fixtures.map(f=>f.id);
  return [mode,{ambient:program.ambient,fixtureCount:ids.length,
   mains:program.fixtures.filter(f=>f.power==='mains').length,
   backup:program.fixtures.filter(f=>f.power==='backup').length,
   sourceCount:program.sources.length,
   uniqueIds:new Set(ids).size,
   appearance:{...appearance}}];
 }));
 const s=newSession(0,undefined,'floor-plan','small','hold',l1BaselineSite());
 s.lightingMode='night';
 const one=actorLightingLevels(s);
 const reused=actorLightingLevels(s)===one;
 s.objectRevision++;
 const invalidated=actorLightingLevels(s)!==one;
 return {
  contract:'L1.0 existing implementation; no active power state',
  layouts,modes,occlusion:l1BaselineOcclusion(),
  sight:{gainAtZero:lightVisibilityGain(0),
   gainAtDay:lightVisibilityGain(.85),cacheReused:reused,
   objectRevisionInvalidates:invalidated},
  caps:{fixtures:32,gridAxis:96,beamSamples:LIGHT_BEAM_SAMPLES}
 };
}
export function checkL1Baseline(report=l1BaselineCensus()){
 const {modes,occlusion,sight,layouts}=report;
 assert.equal(layouts.length,4);
 assert.ok(layouts.every(l=>l.rooms<=8&&l.doors<=12&&l.cover<=10));
 for(const name of L1_BASELINE_MODES){
  const row=modes[name];
  assert.ok(row.ambient>=0&&row.ambient<=1);
  assert.ok(row.fixtureCount<=report.caps.fixtures);
  assert.equal(row.fixtureCount,row.sourceCount);
  assert.equal(row.fixtureCount,row.uniqueIds);
  assert.ok(row.appearance.sun>=0);
 }
 assert.ok(modes.day.ambient>modes.evening.ambient);
 assert.ok(modes.evening.ambient>modes.night.ambient);
 assert.ok(modes.night.ambient>modes.blackout.ambient);
 assert.ok(modes.blackout.backup>0);
 assert.equal(modes.blackout.mains,0);
 assert.equal(modes.emergency.mains,0);
 assert.ok(occlusion.clear>.2&&occlusion.glazed>.2);
 assert.equal(occlusion.opaque,0);
 assert.equal(occlusion.wall,0);
 assert.equal(occlusion.coneVertices,occlusion.expectedConeVertices);
 assert.equal(sight.gainAtDay,1);
 assert.ok(sight.gainAtZero>=.30&&sight.gainAtZero<1);
 assert.equal(sight.cacheReused,true);
 assert.equal(sight.objectRevisionInvalidates,true);
 return true;
}
const median=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length/2)];
const elapsed=(fn,iterations=24)=>{
 for(let i=0;i<6;i++)fn();
 const times=[];
 for(let i=0;i<iterations;i++){
  const start=performance.now();fn();times.push(performance.now()-start);
 }
 return {medianMs:+median(times).toFixed(3),
  worstMs:+Math.max(...times).toFixed(3),iterations};
};
/** Repeatable WORKLOAD, not repeatable wall-clock time. Never assert ms gates. */
export function benchmarkL1Baseline(){
 const site=l1BaselineSite();
 const all=L1_BASELINE_MODES.map(mode=>planSiteLighting(site,mode));
 const blockers=buildIlluminationBlockers(site.walls,site.doors,site.cover);
 const grid={origin:{x:90,y:110},columns:20,rows:20,step:24,
  sources:all[2].sources,blockers,ambient:all[2].ambient};
 const s=newSession(0,undefined,'floor-plan','small','hold',l1BaselineSite());
 s.lightingMode='night';
 return {
  workload:{layout:'compound',sampledCells:400,
   blockers:blockers.length,fixtureSources:all[2].sources.length,
   liveActors:s.operators.filter(a=>a.health>0).length},
  cpu:{
   planAllFiveModes:elapsed(()=>{for(const mode of L1_BASELINE_MODES)
    planSiteLighting(site,mode);}),
   illuminationGrid:elapsed(()=>sampleIlluminationGrid(grid)),
   actorLightingSnapshot:elapsed(()=>{
    s.seconds+=.126;actorLightingLevels(s);
   })
  },
  warning:'Node CPU only; no WebGL draw, GPU, iPhone thermals or frame time. No fixed wall-clock pass/fail threshold.'
 };
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const check=process.argv.includes('--check');
 const report=l1BaselineCensus();
 if(check)checkL1Baseline(report);
 console.log(JSON.stringify({stage:'L1.0',checked:check,
  baseline:report,benchmark:benchmarkL1Baseline()},null,2));
}
