/** R1 deterministic, read-only A/B of the REAL production motor.
 * Runs a short existing outward-leaf scenario with the shadow listener
 * off and on. Does not modify plans, collision, doors, or route selection.
 * node --experimental-strip-types scripts/verification/movement-recovery-r1-shadow-audit.mjs --check
 */
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {doorRangeSite,prepareDoorRangeCase}
 from '../../src/breach-door-test-cases.ts';
import {newSession,team,planSquadEntry,toggling,stepSession}
 from '../../src/breach-game.ts';
import {activateSite} from '../../src/breach-core.ts';
import {setRecoveryProposalObserver}
 from '../../src/breach-recovery-shadow.ts';

export function runR1ShadowMotorCase(observe,ticks=480){
 const id='outward-left';
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite(id),{enableCivilians:false});
 const counts={},reasons={},families={};
 let events=0,disagreements=0;
 try{
  prepareDoorRangeCase(s,id);
  const squad=team(s).slice(0,4);
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  if(observe)setRecoveryProposalObserver(event=>{
   events++;
   const k=event.decision.verdict;
   counts[k]=(counts[k]??0)+1;
   reasons[event.decision.reason]=(reasons[event.decision.reason]??0)+1;
   families[event.proposal.policy.family]=
    (families[event.proposal.policy.family]??0)+1;
   if(event.differsFromActual)disagreements++;
  });
  toggling(s);
  for(let i=0;i<ticks;i++)stepSession(s,1/60);
  const snapshot={
   seconds:s.seconds,
   operators:squad.map(a=>({
    id:a.id,p:{...a.p},nav:a.nav.map(x=>({...x})),
    plan:structuredClone(a.plan),heading:a.heading,
    health:a.health,blockedTime:a.blockedTime,
    recoveryAttempts:a.recoveryAttempts,
    retryRouteAt:a.retryRouteAt,
    lastBlocker:a.lastBlocker,
    doorTraversal:structuredClone(a.doorTraversal??null)
   })),
   doors:s.doors.map(d=>({id:d.id,open:d.open,
    fraction:d.openFraction,locked:d.locked,
    angularVelocity:d.angularVelocity}))
  };
  return {snapshot,diagnostics:{events,counts,reasons,families,disagreements}};
 }finally{
  setRecoveryProposalObserver(null);
  activateSite(null);
 }
}

export function verifyR1ShadowMotorParity(ticks=480){
 const control=runR1ShadowMotorCase(false,ticks);
 const observed=runR1ShadowMotorCase(true,ticks);
 assert.deepEqual(observed.snapshot,control.snapshot,
  'shadow policy changed real motor positions, queue, orders or navigation');
 assert.ok(observed.diagnostics.events>0,
  'door scenario did not exercise any real route-writer transitions');
 assert.equal(Object.values(observed.diagnostics.counts)
  .reduce((sum,n)=>sum+n,0),observed.diagnostics.events);
 return {scene:'outward-left',ticks,parity:true,
  ...observed.diagnostics};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=verifyR1ShadowMotorParity();
 console.log(JSON.stringify(result,null,2));
}
