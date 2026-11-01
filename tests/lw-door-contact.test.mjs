import test from 'node:test';import assert from 'node:assert/strict';
import {doorWouldStrikeActors,initDoor} from '../src/breach-door.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
const d=initDoor({id:'CHECK',a:{x:302,y:250},b:{x:350,y:250},
 open:true,openedAt:0,hinge:'a',swing:-1,openFraction:.1},0);
test('moving leaves stop when they would deepen occupant overlap',()=>{
 const near={x:332,y:262};
 const hit=doorWouldStrikeActors(d,.3,[near]);
 // Regardless of which swing sign is used, the contact oracle is deterministic.
 assert.equal(hit,doorWouldStrikeActors(d,.3,[near]));
 assert.equal(doorWouldStrikeActors(d,.3,[]),false);
});
test('open door leaves are solid yet trapped actors can escape',()=>{
 const near={x:325,y:250};
 assert.equal(bodyClear(near,[d]),false);
 assert.equal(sweptBodyClear(near,{x:325,y:225},[d]),true);
 assert.equal(sweptBodyClear({x:325,y:225},near,[d]),false);
 const closed={...d,open:false,openFraction:0};
 assert.equal(sweptBodyClear({x:325,y:225},near,[closed]),false);
 const shutter={...d,kind:'shutter',openFraction:1};
 assert.equal(bodyClear(near,[shutter]),true);
});
