import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestTransportCandidate} from '../src/breach-transport-candidate.ts';

const person=(id,side,x,health)=>({
 id,side,p:{x,y:0},health,surrendered:false,carriedById:null,name:id.toUpperCase()
});
const civilian=(id,x,health)=>({
 id,p:{x,y:0},health,carriedById:null,rescueTarget:false
});
test('OC9 transport targeting includes only actually observed downed civilian bodies',()=>{
 const s={operators:[person('rook','blue',0,4)],
  civilians:[civilian('c1',20,0)],missionType:'rescue',
  captureTarget:null,missingRecoveryTargetId:undefined};
 assert.equal(nearestTransportCandidate(s,'rook',()=>false),null,
  'cannot disclose unknown civilians');
 assert.deepEqual(nearestTransportCandidate(s,'rook',()=>true),{
  id:'c1',name:'CIVILIAN CASUALTY',kind:'civilian'});
 s.civilians[0].health=2;
 assert.equal(nearestTransportCandidate(s,'rook',()=>true),null,
  'healthy civilian cannot be dragged or carried as a casualty');
});
test('OC9 missing veteran is selectable through existing DRAG/CARRY targeting',()=>{
 const s={operators:[person('rook','blue',0,4)],
  civilians:[{...civilian('missing',22,0),rescueTarget:true}],
  missionType:'rescue',captureTarget:null,missingRecoveryTargetId:'moss'};
 assert.deepEqual(nearestTransportCandidate(s,'rook',()=>true),{
  id:'missing',name:'MISSING OPERATOR',kind:'civilian'});
 s.civilians[0].carriedById='ash';
 assert.equal(nearestTransportCandidate(s,'rook',()=>true),null,
  'a patient already in another operator custody is not stolen');
});
test('OC9 nearby friendly casualty and capture target use same real transport order',()=>{
 const s={operators:[person('rook','blue',0,4),
  person('moss','blue',20,0),person('suspect','red',40,0)],
  civilians:[civilian('neutral',90,0)],
  missionType:'capture',captureTarget:'suspect',missingRecoveryTargetId:null};
 assert.equal(nearestTransportCandidate(s,'rook',()=>true)?.id,'moss',
  'nearest eligible body wins');
 s.operators[1].health=4;
 assert.equal(nearestTransportCandidate(s,'rook',()=>false),null,
  'capture target still needs actual sight');
 assert.equal(nearestTransportCandidate(s,'rook',()=>true)?.kind,'capture');
});
