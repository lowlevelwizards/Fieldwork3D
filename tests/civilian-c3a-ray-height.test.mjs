import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {firstCivilianAlongRay,civilianBodyHeight}
 from '../src/breach-civilian-ballistics.ts';
const make=(id,x,state='routine')=>{
 const c=createCivilian({id,role:'resident',persona:'steady',
 activity:'idle',position:{x,y:0},heading:0,
 roomId:'r',appearanceSeed:4});
 c.state=state;return c;
};
test('E5-C3: a level 30-unit ray clears hiding civilian but strikes standing',()=>{
 const standing=make('stand',80),hiding=make('duck',80,'hiding');
 const ray={muzzleHeight:30,farHeight:30,farDistance:150};
 assert.equal(civilianBodyHeight(hiding),22);
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,140,[hiding],ray),null);
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,140,[standing],ray)?.actor.id,'stand');
});
test('E5-C3: ray descending into body height hits at physical entrance',()=>{
 const duck=make('duck',80,'hiding');
 const hit=firstCivilianAlongRay({x:0,y:0},0,140,[duck],
 {muzzleHeight:35,farHeight:5,farDistance:150});
 assert.ok(hit&&hit.along>=70&&hit.along<=90);
});
test('E5-C3: nearest physical vertical intersection wins, no hit behind range',()=>{
 const high=make('stand',110),low=make('duck',58,'hiding');
 const ray={muzzleHeight:30,farHeight:30,farDistance:140};
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,140,[low,high],ray).actor.id,'stand');
 assert.equal(firstCivilianAlongRay({x:0,y:0},0,45,[high],ray),null);
});
