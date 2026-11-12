import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {witnessedCivilianThreat,stepCivilianResponse} from '../src/breach-civilian-response.ts';
const p=(x,y)=>({x,y});
const person=(side,x=115)=>({id:'armed',side,p:p(x,0),health:4,
 heading:0,velocity:0,posture:'stand',aim:0,lastShotAt:-100});
test('R5.4 civilian recognizes armed presence versus witnessed danger',()=>{
 assert.equal(witnessedCivilianThreat(person('blue'),p(0,0),9),'caution');
 assert.equal(witnessedCivilianThreat(person('red'),p(0,0),9),'none');
 assert.equal(witnessedCivilianThreat({...person('red'),lastShotAt:8.5},p(0,0),9),'alarm');
 assert.equal(witnessedCivilianThreat({...person('blue'),lastShotAt:8.5},p(0,0),9),'alarm');
 assert.equal(witnessedCivilianThreat(person('blue',45),p(0,0),9),'alarm');
 assert.equal(witnessedCivilianThreat({...person('blue'),heading:Math.PI,aim:.9},p(0,0),9),'alarm');
 assert.equal(witnessedCivilianThreat({...person('blue'),aim:.9},p(0,0),9),'caution');
});
test('R5.4 visible caution escalates when same person points weapon at witness',()=>{
 const c=createCivilian({id:'neutral',role:'customer',persona:'steady',
 activity:'waiting',position:p(0,0),heading:0,roomId:'shop',appearanceSeed:1});
 const armed=person('blue',80);
 const world={noise:[],people:[armed],doors:[],walls:[],windows:[],
   canSee:()=>true,canReach:()=>false};
 for(let t=.2;t<=4;t+=.2)stepCivilianResponse(c,t,.2,world);
 assert.notEqual(c.state,'startled','distant nonthreatening sight should not force panic');
 const prior=c.lastEvidenceId;
 armed.heading=Math.PI;armed.aim=1;
 for(let t=4.2;t<=6;t+=.2)stepCivilianResponse(c,t,.2,world);
 assert.notEqual(c.lastEvidenceId,prior);
 assert.ok(c.fear>=.56,'observed pointed weapon causes actual fear');
});
