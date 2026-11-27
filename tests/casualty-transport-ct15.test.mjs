import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileCivilianTransportFrame} from '../src/breach-civilian-transport.ts';
import {chooseTransportStep} from '../src/breach-transport-recovery.ts';
const pt=x=>({x,y:0});
test('CT15 final body geometry rejection atomically rolls back the carrier',()=>{
 const p=[{id:'carrier',from:pt(25),to:pt(26),alive:true,side:'blue'},
 {id:'body',from:pt(0),to:pt(1),alive:false,carried:true,side:'red'}];
 const decisions=[{id:'carrier',point:pt(26),blocked:null},{id:'body',point:pt(0),blocked:'geometry'}];
 reconcileCivilianTransportFrame(p,decisions,[{carrierId:'carrier',bodyId:'body'}]);
 assert.deepEqual(decisions.map(x=>x.point),[pt(25),pt(0)]);
 assert.ok(decisions.every(x=>x.blocked==='geometry'));
});
test('CT15 direct and alternate carrier footprints both need geometry clearance',()=>{
 const result=chooseTransportStep(pt(0),pt(1),p=>p,(_a,b)=>b.x<=.5);
 assert.equal(result.adjusted,true);assert.deepEqual(result.carrier,pt(.5));
 assert.equal(chooseTransportStep(pt(0),pt(1),p=>p,()=>false),null);
});
