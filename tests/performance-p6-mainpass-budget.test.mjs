import test from 'node:test';
import assert from 'node:assert/strict';
import {mainPassBudgetReport}
 from '../scripts/verification/performance-p6-mainpass-budget.mjs';
const observed=()=>({
 schema:'fieldwork-e6.17-main-pass-v1',
 runs:[{
  seed:23,briefingIdle:'1',errors:0,liveFrames:90,
  live3DSubmissions:90,callbacksWithSimulation:90,sceneP95Ms:45,
  phaseP95Ms:{gpuSubmit:33},
  renderSubmission:{nonShadowDrawCallsP95:947,nonShadowP95Ms:31.8,
   nonShadowWorstMs:289.4},
  mainPassAttribution:{
   frames:90,reliableFrames:90,reconciledWithNonShadowFrames:90,
   drawCallsP95:947,uniqueMaterialsP95:368,opaqueDrawsP95:595,
   transparentDrawsP95:340,
   dominantOwners:[{owner:'operator',drawsTotal:42755},
    {owner:'environment',drawsTotal:40854}],
   dominantTransparencyRoles:[{role:'wall-weathering',drawsTotal:6120}]
  }
 }]
});
test('P6.F reports exact counted owner draws, material and transparent role budgets',()=>{
 const report=mainPassBudgetReport(observed());
 assert.equal(report.schema,'fieldwork-p6-mainpass-budget-v1');
 const row=report.rows[0];
 assert.equal(row.mainDrawCallsP95,947);
 assert.equal(row.mainUniqueMaterialsP95,368);
 assert.equal(row.transparentDrawsP95,340);
 assert.equal(row.owners[0].meanDrawsPerFrame,475.06);
 assert.equal(row.transparency[0].meanDrawsPerFrame,68);
 assert.match(report.caveat,/Not hardware GPU time or mobile\/iPhone FPS/);
});
test('P6.F never silently reports missing scene samples or mismatched draw counts',()=>{
 for(const mutate of [
  x=>{x.runs[0].errors=1;},
  x=>{x.runs[0].liveFrames=10;},
  x=>{x.runs[0].mainPassAttribution.reliableFrames=20;},
  x=>{x.runs[0].renderSubmission.nonShadowDrawCallsP95=999;}
 ]){
  const x=observed();mutate(x);
  assert.throws(()=>mainPassBudgetReport(x),/Incomplete or unreconciled/);
 }
 assert.throws(()=>mainPassBudgetReport({runs:[]}),/Expected real E6.17/);
});
