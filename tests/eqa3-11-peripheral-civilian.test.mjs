import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianResponse} from '../src/breach-civilian-response.ts';
const subject=()=>createCivilian({
 id:'civ:peripheral',role:'visitor',persona:'steady',activity:'idle',
 position:{x:0,y:0},heading:0,roomId:'hall',appearanceSeed:15
});
const operator=(position={x:0,y:42},velocity=30)=>({
 id:'MOSS',p:position,heading:Math.PI,health:4,velocity,
 posture:'stand',side:'blue',aim:0,lastShotAt:-100
});
const world=(person,visible=true)=>({
 noise:[],people:[person],doors:[],walls:[],windows:[],
 canSee:()=>visible,canReach:()=>visible,routeTo:()=>[]
});
const observe=(c,w,count=12)=>{
 for(let i=1;i<=count;i++)stepCivilianResponse(c,i*.16,.16,w);
};
test('EQA3.11 peripheral moving visible operator creates gradual sensory progress',()=>{
 const c=subject(),w=world(operator());
 stepCivilianResponse(c,.16,.16,w);
 assert.ok(c.visualProgress.MOSS>0,'peripheral motion gives slow visual evidence');
 assert.ok(c.visualProgress.MOSS<1,'one glimpse does not confer immediate knowledge');
 assert.equal(c.threatEstimate,null,'no exact target before progressive sight confirmation');
 observe(c,w);
 assert.ok(c.threatEstimate,'repeated physically verified sightings eventually identify presence');
 assert.equal(c.lastVisualId,'MOSS/alarm');
});
test('EQA3.11 wall, stationary peripheral figure and person behind remain unidentified',()=>{
 for(const [person,visible] of [
   [operator({x:0,y:42},0),true],
   [operator({x:-42,y:0},30),true],
   [operator({x:0,y:42},30),false],
   [operator({x:0,y:95},30),true],
 ]){
  const c=subject();observe(c,world(person,visible));
  assert.equal(c.visualProgress.MOSS,0);
  assert.equal(c.threatEstimate,null);
 }
});
test('EQA3.11 direct-cone visual progress remains unmodified',()=>{
 const c=subject();observe(c,world(operator({x:42,y:0},0)),2);
 assert.ok(c.visualProgress.MOSS>0,'ordinary direct awareness remains intact');
});
