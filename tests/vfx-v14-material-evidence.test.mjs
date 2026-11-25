import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentAttachment} from '../src/breach-impact-surface.ts';
import {retainImpactMark} from '../src/breach-impact-evidence-buffer.ts';
import {ageImpactEvidence} from '../src/breach-blood-evidence.ts';
import {damageRadius} from '../src/rendering/breach-stain-atlas.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const wall={a:{x:0,y:0},b:{x:100,y:0}};
function mark(id,x=40,face=1,index=0,y=25){
 const ref=segmentAttachment('wall',index,undefined,wall,{x,y:face*20},{x,y:-face*20},.5,y);
 return {id,shotId:id,p:{x,y:0},surface:'stone',age:0,height:y,surfaceRef:ref};
}
test('owned damage remains mission-long; unowned legacy evidence expires',()=>{
 const s={impactMarks:[]};retainImpactMark(s,mark(1));
 retainImpactMark(s,{id:2,p:{x:20,y:5},surface:'dust',age:0,height:1});
 ageImpactEvidence(s.impactMarks,90);
 assert.equal(s.impactMarks.length,1);assert.equal(s.impactMarks[0].age,3);
 const stable=JSON.stringify(s.impactMarks);ageImpactEvidence(s.impactMarks,1/60);
 assert.equal(JSON.stringify(s.impactMarks),stable);
});
test('nearby repeated damage grows in place, deduplicates final stop, preserves different faces/owners/heights',()=>{
 const s={impactMarks:[]};retainImpactMark(s,mark(1));retainImpactMark(s,mark(1));
 retainImpactMark(s,mark(2,41));retainImpactMark(s,mark(2,41));
 assert.equal(s.impactMarks.length,1);assert.equal(s.impactMarks[0].damageCount,2);
 for(let id=3;id<15;id++)retainImpactMark(s,mark(id,41));
 assert.equal(s.impactMarks[0].damageCount,4);assert.equal(s.impactMarks[0].id,1);
 assert.ok(damageRadius('stone',4)>damageRadius('stone',1));
 for(const m of [mark(20,40,-1),mark(21,40,1,1),mark(22,40,1,0,35),mark(23,60)])retainImpactMark(s,m);
 assert.equal(s.impactMarks.length,5);
});
test('persistent marks survive transient churn and replay restores accumulation',()=>{
 const s=newSession();s.impactMarks=[];retainImpactMark(s,mark(1));const early=snapshot(s);
 retainImpactMark(s,mark(2,41));const later=snapshot(s);
 for(let i=0;i<100;i++)retainImpactMark(s,{id:100+i,p:{x:i,y:2},surface:'dust',age:0});
 assert.ok(s.impactMarks.some(m=>m.id===1));assert.equal(s.impactMarks.length,64);
 applyReplayFrame(s,early);assert.equal(s.impactMarks[0].damageCount,undefined);
 applyReplayFrame(s,later);assert.equal(s.impactMarks[0].damageCount,2);
});
