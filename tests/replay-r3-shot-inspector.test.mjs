import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRecordedShot,shotScreenHit,adjacentRecordedShot}
  from '../src/breach-replay-shot-inspector.ts';
const shots=[1,2,3].map((id,i)=>({
 id,recordedAt:i,shooterId:id===3?'guard0':'rook',
 targetId:'guard0',side:id===3?'red':'blue',
 weaponAtFire:'carbine',start:{x:10,y:10},end:{x:100+i*40,y:120},
 age:0,hit:true,down:false,healthBefore:3,healthAfter:2
}));
test('forensics reads recorded geometry and redacts concealed targets',()=>{
 const known={visibleActorIds:['rook'],visibleCivilianIds:[],
  discoveredBodyIds:[]};
 const hidden=inspectRecordedShot(shots[0],known,false);
 assert.equal(hidden.targetId,null);
 assert.equal(hidden.healthAfter,null);
 assert.equal(hidden.hit,false);
 assert.deepEqual(hidden.end,{x:100,y:120});
 assert.equal(inspectRecordedShot(shots[0],known,true).healthAfter,2);
 assert.equal(inspectRecordedShot(shots[0],{
  ...known,discoveredBodyIds:['guard0']},false).targetId,'guard0');
});
test('screen selection is bounded to visible recent recorded impacts',()=>{
 const hit=shotScreenHit(shots,2,{x:141,y:120},p=>p,
  shot=>shot.shooterId==='rook');
 assert.equal(hit?.id,2);
 assert.equal(shotScreenHit(shots,8,{x:140,y:120},p=>p,()=>true),null);
 assert.equal(shotScreenHit(shots,2,{x:180,y:120},p=>p,
  shot=>shot.shooterId==='rook'),null);
 assert.equal(adjacentRecordedShot(shots,1,true,s=>s.shooterId==='rook')?.id,2);
 assert.equal(adjacentRecordedShot(shots,2,true,s=>s.shooterId==='rook'),null);
});
