import test from 'node:test';
import assert from 'node:assert/strict';
import {TRIALS} from '../src/training/training-trials.ts';
import {saveTrainingRecord,loadTrainingRecords,trainingRecordKey,
 parseTrainingRecords} from '../src/training/training-records.ts';
test('course best is isolated from campaign and keyed by complete trial contract',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)??null,
  setItem:(k,v)=>store.set(k,v)};
 const record={outcome:'passed',grade:'B',score:84,elapsed:90,
  shots:8,targetsHit:5,targetsTotal:5,noShootHits:0,squadSize:1,
  squadSurvived:1,components:[]};
 saveTrainingRecord(TRIALS.discrimination,record,storage);
 assert.equal(loadTrainingRecords(storage).find(r=>
  r.key===trainingRecordKey(TRIALS.discrimination))?.grade,'B');
 assert.equal(loadTrainingRecords(storage).find(r=>
  r.key===trainingRecordKey(TRIALS.room)),undefined);
});
test('malformed, partial or untrusted local records cannot crash setup',()=>{
 assert.deepEqual(parseTrainingRecords('malformed'),[]);
 assert.deepEqual(parseTrainingRecords('{"not":"array"}'),[]);
 assert.deepEqual(parseTrainingRecords('[null, {}, {"key":"x"}]'),[]);
});
test('player-facing setup displays personal-best results for selected trial',async()=>{
 const {readFile}=await import('node:fs/promises');
 const ui=await readFile(new URL('../src/ui/breach-training-screen.ts',import.meta.url),'utf8');
 assert.match(ui,/PERSONAL BEST/);
 assert.match(ui,/trainingRecordKey\(trial\)/);
 assert.match(ui,/trials\.el\.addEventListener\('change',renderPersonalBest\)/);
});
