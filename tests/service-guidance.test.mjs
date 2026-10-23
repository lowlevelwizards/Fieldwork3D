import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkJob } from '../src/fieldwork/network-job.ts';
import { inspectionGuidance, diagnosedDestination, stationDisplayName } from '../src/fieldwork/service-guidance.ts';

test('relay 0 V guides upstream rather than implying the relay must be repaired', () => {
 const job=new NetworkJob(0); // Generator does not produce power
 assert.equal(job.network.inspection('relay').voltage,0);
 assert.equal(job.diagnosed,false);
 assert.match(inspectionGuidance(job,'relay'),/CHECK SWITCHGEAR UPSTREAM/);
 assert.equal(diagnosedDestination(job,'relay'),null); // Do not disclose hidden fault
});
test('Mica diagnoses generator; distant Rook gets an actionable correct destination', () => {
 const job=new NetworkJob(0);
 assert.equal(job.inspect('generator').newDiagnosis,true);
 assert.equal(job.target,'generator');
 assert.equal(diagnosedDestination(job,'relay'),'generator');
 assert.match(inspectionGuidance(job,'relay'),/FAULT AT GENERATOR/);
 assert.equal(stationDisplayName.generator,'GENERATOR');
 assert.equal(diagnosedDestination(job,'generator'),null);
 assert.equal(job.network.mastOnline,false);
});
test('remote handoff does not fake work: generator needs Rook to actually work there', () => {
 const job=new NetworkJob(0);
 job.inspect('generator');
 assert.equal(job.phase,'diagnosed');
 assert.equal(job.network.generatorRunning,false);
 assert.equal(job.network.mastOnline,false);
 assert.equal(diagnosedDestination(job,'relay'),'generator');
 assert.equal(job.begin(true,false),true);
 job.update(.05,false,true,false);
 assert.equal(job.phase,'diagnosed');
 assert.equal(job.network.generatorRunning,false);
});
test('all observed fault locations route toward their correct physical workstation', () => {
 for(let index=0;index<6;index++){
   const j=new NetworkJob(index);
   j.inspect(j.target);
   assert.equal(diagnosedDestination(j,'mast'),j.target);
 }
});
