import test from 'node:test';
import assert from 'node:assert/strict';
import {assessMissionFilm} from '../src/breach-mission-quality.ts';
const frame=(t,mission='secure')=>({
 t,mission,actors:[{id:'rook',p:{x:40,y:40}}],
 rescue:null
});
const event=(id,t,kind,text)=>({id,t,kind,text});
test('G4d: stealth objective before confirmed contact is legal',()=>{
 const frames=[frame(0),frame(3),frame(6)];
 const events=[
  event(1,2,'objective','DOCUMENTS RECOVERED'),
  event(2,5,'intel','ROOK SPOTTED HOSTILE')
 ];
 const result=assessMissionFilm(frames,events,1);
 assert.deepEqual(result.issues,[]);
 assert.equal(result.objectiveAt,2);
 assert.equal(result.firstContactAt,5);
});
test('G4d: genuinely impossible chronology still fails',()=>{
 const frames=[frame(0),frame(6,'done')];
 const events=[
  event(1,4,'objective','MISSION COMPLETE'),
  event(2,5,'objective','DOCUMENTS RECOVERED')
 ];
 const quality=assessMissionFilm(frames,events,1);
 assert.ok(quality.issues.includes('extraction before objective'));
});
test('G4d: replay bounds and missing extraction remain hard failures',()=>{
 const frames=[frame(0),{...frame(2,'done'),actors:[{id:'rook',p:{x:NaN,y:4}}]}];
 const result=assessMissionFilm(frames,[event(1,4,'shot','ROOK FIRED')],1);
 assert.ok(result.issues.includes('invalid actor position at 1'));
 assert.ok(result.issues.includes('event outside replay time'));
 assert.ok(result.issues.includes('completed mission without extraction event'));
});
