import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {l1BaselineSite,l1BaselineCensus,l1BaselineOcclusion,
 L1_BASELINE_LAYOUTS,L1_BASELINE_MODES,checkL1Baseline,benchmarkL1Baseline}
 from '../scripts/audit-l1-lighting-baseline.mjs';
import {planSiteLighting} from '../src/equipment-site-lighting.ts';
import {lightingPresentation} from '../src/equipment-lighting-presentation.ts';
import {newSession} from '../src/breach-game.ts';
import {captureReplayManifest} from '../src/breach-replay-manifest.ts';
import {actorLightingLevels} from '../src/equipment-sight-lighting.ts';
import {activeWeaponLightSources} from '../src/equipment-portable-light-sources.ts';
import {initialWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {toggleWeaponLight} from '../src/breach-tactical-control-commands.ts';
import {sampleIlluminationGrid} from '../src/equipment-light-field.ts';

test('L1.0 census captures real authored K1 topology, presets and source budget',()=>{
 const report=l1BaselineCensus();
 assert.equal(checkL1Baseline(report),true);
 for(const layout of L1_BASELINE_LAYOUTS){
  const site=l1BaselineSite(layout);
  assert.deepEqual(site,l1BaselineSite(layout));
  for(const mode of L1_BASELINE_MODES){
   const a=planSiteLighting(site,mode),b=planSiteLighting(site,mode);
   assert.deepEqual(a,b,layout+' '+mode);
   assert.deepEqual(a.sources.map(x=>x.id),a.fixtures.map(x=>x.id));
   assert.ok(a.fixtures.every(f=>site.rooms.some(r=>r.id===f.roomId)));
  }
 }
});
test('L1.0 lights remain physical rays, not an extra reveal channel',()=>{
 const evidence=l1BaselineOcclusion();
 assert.ok(evidence.clear>0);
 assert.equal(evidence.opaque,0);
 assert.equal(evidence.wall,0);
 assert.ok(evidence.glazed>0);
 const grid=sampleIlluminationGrid({origin:{x:0,y:0},
  columns:300,rows:300,step:30,sources:[],blockers:[],ambient:.10});
 assert.equal(grid.length,96*96);
 assert.ok(grid.every(v=>Math.abs(v-.10)<1e-7));
});
test('L1.0 existing cache invalidates on supported revision, time and preset keys',()=>{
 const s=newSession(0,undefined,'floor-plan','small','hold',l1BaselineSite());
 const day=actorLightingLevels(s);
 assert.equal(actorLightingLevels(s),day);
 s.objectRevision++;
 const revised=actorLightingLevels(s);
 assert.notEqual(revised,day);
 s.seconds+=.126;
 const future=actorLightingLevels(s);
 assert.notEqual(future,revised);
 s.lightingMode='blackout';
 const dark=actorLightingLevels(s);
 assert.notEqual(dark,future);
 assert.ok((dark.get('rook')??0)<=(future.get('rook')??1));
});
test('L1.0 existing weapon light is fitted, operator-owned and replayable',()=>{
 const s=newSession(0,undefined,'floor-plan','small','hold',l1BaselineSite());
 const a=s.operators.find(a=>a.id==='rook');
 assert.ok(a);
 a.weaponConfiguration=initialWeaponConfiguration(a.weapon);
 a.weaponLightOn=false;
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,0);
 assert.equal(toggleWeaponLight(s,a.id),false);
 a.weaponConfiguration=setWeaponAttachment(a.weaponConfiguration,
  'light','light-compact');
 assert.equal(toggleWeaponLight(s,a.id),true);
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,1);
 assert.equal(toggleWeaponLight(s,a.id),true);
 assert.equal(activeWeaponLightSources(s.operators,s.doors).length,0);
 const replay=captureReplayManifest(s);
 assert.equal(replay.lightingMode,s.lightingMode);
 assert.ok(replay.site);
 assert.equal(replay.schemaVersion,2);
});
test('L1.0 view profiles keep the same mode contract across 2D and ISO',()=>{
 for(const mode of L1_BASELINE_MODES){
  const profile=lightingPresentation(mode);
  assert.ok(profile.sun>=0&&profile.hemisphere>=0);
  assert.ok(profile.floorTint>=0&&profile.floorTint<1);
 }
 const read=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
 const iso=read('../src/breach-3d.ts');
 const flat=read('../src/breach-2d-world-renderer.ts');
 const sight=read('../src/breach-visual-acquisition.ts');
 assert.match(iso,/lightingPresentation\(s\.lightingMode\)/);
 assert.match(flat,/lightingPresentation\(state\.lightingMode\)/);
 assert.match(iso,/lightBeamFootprint/);
 assert.match(flat,/lightBeamFootprint/);
 assert.match(sight,/geometricallyVisible\(observer,subject,s\)/);
 assert.match(sight,/lightVisibilityGain/);
});
test('L1.0 stage is non-mutating and does not create a second simulator',()=>{
 const site=l1BaselineSite(),copy=structuredClone(site);
 for(const mode of L1_BASELINE_MODES)planSiteLighting(site,mode);
 assert.deepEqual(site,copy);
 const blank={...site,rooms:[]};
 assert.equal(planSiteLighting(blank,'night').fixtures.length,0);
 assert.equal(planSiteLighting(blank,'blackout').sources.length,0);
});

test('L1.0 CPU workload emits reproducible counters without a brittle timing gate',()=>{
 const report=benchmarkL1Baseline();
 assert.equal(report.workload.layout,'compound');
 assert.equal(report.workload.sampledCells,400);
 assert.ok(report.workload.blockers>0);
 assert.ok(report.workload.fixtureSources>0);
 for(const item of Object.values(report.cpu)){
  assert.equal(item.iterations,24);
  assert.ok(Number.isFinite(item.medianMs)&&item.medianMs>=0);
  assert.ok(Number.isFinite(item.worstMs)&&item.worstMs>=item.medianMs);
 }
 // Keep numerical observations in CI logs; never fail CI on CPU milliseconds.
 console.log('L1.0 CPU BASELINE '+JSON.stringify(report));
});
