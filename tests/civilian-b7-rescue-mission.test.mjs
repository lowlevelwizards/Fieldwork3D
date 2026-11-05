import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {canSecureRescuePerson,rescueEscortSeparated,rescueFollowGoal}
 from '../src/breach-civilian-mission.ts';
const p=createCivilian({id:'rescue',role:'rescue',persona:'cautious',
 activity:'waiting',position:{x:80,y:80},heading:0,roomId:'r',
 isRescueTarget:true,appearanceSeed:1});
test('E5-B7 a person is secured only physically, never across a closed wall',()=>{
 const operator={p:{x:90,y:80},health:4};
 assert.equal(canSecureRescuePerson(p,operator,()=>true),true);
 assert.equal(canSecureRescuePerson(p,operator,()=>false),false);
 assert.equal(canSecureRescuePerson(p,{...operator,p:{x:300,y:80}},
  ()=>true),false);
});
test('E5-B7 actual rescue formation handles separation and incapacitation',()=>{
 assert.equal(rescueEscortSeparated(p,{p:{x:90,y:80},health:4}),false);
 assert.equal(rescueEscortSeparated(p,{p:{x:250,y:80},health:4}),true);
 assert.deepEqual(rescueFollowGoal({p:{x:100,y:80},heading:0}),
  {x:77,y:80});
});
