/** Summarize actual E6.17 real-browser scene submissions by owner/role.
 * No synthetic FPS, unsupported GPU elapsed time, or pass/fail speed budget.
 * Baseline and candidate comparisons MUST use identical seeds/conditions.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const rounded=n=>Number(Number(n).toFixed(2));
export function mainPassBudgetReport(data){
 if(data?.schema!=='fieldwork-e6.17-main-pass-v1'||
   !Array.isArray(data.runs)||!data.runs.length)
  throw Error('Expected real E6.17 live main-pass evidence');
 const rows=[];
 for(const run of data.runs){
  const draws=run.mainPassAttribution,submission=run.renderSubmission;
  if(run.errors!==0||run.liveFrames<85||run.live3DSubmissions<85||
    !draws||draws.reliableFrames<85||
    draws.reconciledWithNonShadowFrames<85||
    draws.drawCallsP95!==submission?.nonShadowDrawCallsP95)
   throw Error('Incomplete or unreconciled real live draw evidence');
  const owners=(draws.dominantOwners??[]).map(x=>({
   owner:x.owner,meanDrawsPerFrame:rounded(x.drawsTotal/draws.frames)
  }));
  const transparency=(draws.dominantTransparencyRoles??[]).map(x=>({
   role:x.role,meanDrawsPerFrame:rounded(x.drawsTotal/draws.frames)
  }));
  rows.push({
   seed:run.seed,briefingIdle:run.briefingIdle,
   submittedFrames:run.live3DSubmissions,liveSimulationCallbacks:run.callbacksWithSimulation,
   mainDrawCallsP95:draws.drawCallsP95,
   mainUniqueMaterialsP95:draws.uniqueMaterialsP95,
   opaqueDrawsP95:draws.opaqueDrawsP95,
   transparentDrawsP95:draws.transparentDrawsP95,
   mainPassCpuWallP95Ms:submission.nonShadowP95Ms,
   mainPassCpuWallWorstMs:submission.nonShadowWorstMs,
   sceneCpuWallP95Ms:run.sceneP95Ms,
   gpuSubmitCpuWallP95Ms:run.phaseP95Ms?.gpuSubmit,
   owners,transparency
  });
 }
 return {schema:'fieldwork-p6-mainpass-budget-v1',
  caveat:'Chromium ANGLE SwiftShader CPU/driver wall and renderBufferDirect submissions only. Not hardware GPU time or mobile/iPhone FPS. No arbitrary frame budget used to pass/fail.',
  rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const path=process.argv[2]??'artifacts/refactor-e6-17/live-scene/summary.json';
 const result=mainPassBudgetReport(JSON.parse(readFileSync(path,'utf8')));
 const output=process.argv[3];
 if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log('P6_MAINPASS_BUDGET',JSON.stringify(result));
}
