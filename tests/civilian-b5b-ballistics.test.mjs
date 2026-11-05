import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {firstCivilianAlongRay,applyCivilianBulletHit}
 from '../src/breach-civilian-ballistics.ts';
const make=(id,x,y)=>createCivilian({id,role:'visitor',
 persona:'steady',activity:'idle',position:{x,y},heading:0,
 roomId:'front',appearanceSeed:1});
test('E5-B5b nearest actual body intercepts, not target selection',()=>{
 const a=make('near',50,0),b=make('far',90,0);
 const hit=firstCivilianAlongRay({x:0,y:0},0,110,[b,a]);
 assert.equal(hit.actor.id,'near');
 assert.ok(hit.along>0&&hit.along<50);
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,30,[a,b]),null);
});
test('E5-B5b walls and penetration gates limit physical victim range',()=>{
 const c=make('behindWall',100,0);
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,70,[c]),null);
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,115,[c]).actor.id,'behindWall');
 assert.equal(firstCivilianAlongRay({x:0,y:0},Math.PI/2,115,[c]),null);
});
test('E5-B5b actual hit wounds neutral without hostile kill or weapon state',()=>{
 const a=make('person',80,0);
 assert.deepEqual(applyCivilianBulletHit(a,5),{before:2,after:1,down:false});
 assert.equal(a.state,'wounded');
 assert.deepEqual(applyCivilianBulletHit(a,6),{before:1,after:0,down:true});
 assert.equal(a.state,'incapacitated');
 assert.equal('side' in a,false);
 assert.deepEqual(applyCivilianBulletHit(a,7),{before:0,after:0,down:true});
});
