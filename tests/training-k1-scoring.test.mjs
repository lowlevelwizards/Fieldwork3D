import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIAL_IDS,TRIALS,trialConfig} from '../src/training/training-trials.ts';
import {assessTrainingTrial} from '../src/training/training-scoring.ts';
import {trainingRecordKey,saveTrainingRecord,loadTrainingRecords}
 from '../src/training/training-records.ts';
import {buildTrainingSite} from '../src/training/training-site-builder.ts';
import {newSession} from '../src/breach-game.ts';
test('trial catalog has distinct deterministic configurations',()=>{
 for(const id of TRIAL_IDS){
  const d=TRIALS[id],config=trialConfig(id);
  assert.equal(config.squadSize,d.squadSize);
  assert.equal(config.layout,d.layout);
  assert.equal(config.lighting,d.lighting);
  assert.ok(d.maxSeconds>=180);
 }
});
test('trial grading reads real Session evidence and does not mutate state',()=>{
 const t=TRIALS.discrimination,site=buildTrainingSite(trialConfig(t.id));
 const s=newSession(0,undefined,'full-view','small','hold',site);
 const before=s.seconds,assessment=assessTrainingTrial(s,t);
 assert.equal(assessment.outcome,'incomplete');
 assert.equal(assessment.targetsTotal,6);
 assert.equal(s.seconds,before);
});
test('record keys separate course versions and local storage holds only best',()=>{
 const d=TRIALS.discrimination;
 const data=new Map();
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const result={outcome:'passed',score:90,grade:'A',elapsed:100,
  squadSize:1,shots:10};
 const a=saveTrainingRecord(d,result,storage,10);
 assert.equal(a.saved,true);
 const b=saveTrainingRecord(d,{...result,score:80},storage,11);
 assert.equal(b.saved,false);
 assert.equal(loadTrainingRecords(storage)[0].score,90);
 assert.equal(trainingRecordKey(d),a.best.key);
});
