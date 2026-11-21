/** D3.32 P3: real Clinic D9 body-release acceptance, 45s at 60Hz.
 * Same frozen seed, real motor, original goals and unchanged doors.
 * Success requires Rook's REAL physical arrival, not an empty plan,
 * queued follower release, a synthetic completion or a collision waiver.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('D3.32 P3 Clinic D9: genuinely arrived lead after fully swept open-leaf rejoin',()=>{
 const report=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=10','--audit-seed=14490156',
  '--audit-scale=standard','--progress','--route-transitions'
 ],{cwd:root,maxBuffer:16*1024*1024,timeout:120000,encoding:'utf8'}));
 const run=report.rows[0].modes.find(m=>m.mode==='authored');
 const rook=run?.operators.find(a=>a.id==='rook');
 const pending=run?.operators.filter(a=>a.outcome==='pending').map(a=>a.id);
 console.log('D332_P3_CLINIC_D9',JSON.stringify({
  arrivals:run?.arrivals,pending,rook:rook&&{
   outcome:rook.outcome,remaining:rook.remaining,
   blocker:rook.lastBlocker,doorEpisode:rook.doorEpisode,
   routes:run.routeTransitions?.byActor,
   progress:run.progressEvidence.filter(x=>x.actor==='rook')
    .map(x=>({seconds:x.seconds,net:x.net,travel:x.travel,
      remaining:x.remaining,classification:x.classification}))
  }}));
 assert.equal(report.ticks,2700);
 assert.equal(report.summary.physicsStepViolations,0);
 assert.equal(report.summary.invalidPositions,0);
 assert.equal(report.summary.corruptedPlans,0);
 assert.equal(report.summary.exceptions,0);
 assert.equal(run?.operators.length,4);
 assert.ok(run.arrivals>=2,'at least one additional genuine physical arrival');
 assert.equal(rook?.outcome,'arrived',
  'must free and actually complete Rook, not just hide a waiting follower');
 assert.ok(!pending.some(id=>id==='ash'),
  'previously arrived Ash must not regress');
});
