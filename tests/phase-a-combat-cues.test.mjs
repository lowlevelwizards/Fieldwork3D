import test from 'node:test';
import assert from 'node:assert/strict';
import {muzzleFlashCue,mostRecentActiveMuzzleShot}
 from '../src/breach-combat-cues.ts';

const shot=(id,shooterId,age)=>({id,shooterId,age});

test('A5: rapid overlapping shots display the latest authoritative muzzle event',()=>{
 const shots=[shot(1,'blue',.08),shot(2,'red',.01),shot(3,'blue',.015)];
 const copy=structuredClone(shots);
 const visible=[];
 const result=mostRecentActiveMuzzleShot(shots,'blue','carbine',null,s=>{
  visible.push(s.id);return true;
 });
 assert.equal(result?.id,3,'the latest shot must not be hidden by an older burst');
 assert.deepEqual(visible,[3],'do not run visibility tests for irrelevant older shots');
 assert.deepEqual(shots,copy,'presentation cannot mutate the shot history');
 assert.ok(muzzleFlashCue('carbine',result.age).scale>
   muzzleFlashCue('carbine',shots[0].age).scale);
});

test('A5: historical shot visibility and suppressor handling remain authoritative',()=>{
 const shots=[shot(1,'blue',.01),shot(2,'blue',.005)];
 assert.equal(mostRecentActiveMuzzleShot(shots,'blue','carbine',null,
   s=>s.id!==2)?.id,1,
   'a later undisclosed shot must not reveal a forbidden flash');
 assert.equal(mostRecentActiveMuzzleShot(shots,'blue','carbine',null,
   ()=>false),undefined);
 assert.equal(mostRecentActiveMuzzleShot(shots,'blue','carbine',null,
   ()=>true)?.id,2);
 assert.ok(muzzleFlashCue('carbine',.005,'muzzle-suppressor').scale<
   muzzleFlashCue('carbine',.005,null).scale);
});

test('A5: expired shots, foreign shooters and empty history produce no flash',()=>{
 assert.equal(mostRecentActiveMuzzleShot([], 'blue','carbine',null,()=>true),undefined);
 assert.equal(mostRecentActiveMuzzleShot([shot(1,'red',0)],'blue',
   'carbine',null,()=>true),undefined);
 assert.equal(mostRecentActiveMuzzleShot([shot(1,'blue',1)],'blue',
   'carbine',null,()=>true),undefined);
});
