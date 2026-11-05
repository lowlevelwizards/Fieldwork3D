import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {knownCivilianInFireLane}
 from '../src/breach-civilian-fire-safety.ts';
import {firstCivilianAlongRay} from '../src/breach-civilian-ballistics.ts';
const person=(id,x,y,state='routine')=>{
 const c=createCivilian({id,role:'resident',persona:'steady',
  activity:'idle',position:{x,y},heading:0,roomId:'room',
  appearanceSeed:3});
 c.state=state;return c;
};
test('E5-D2 known body physically obstructs shot only before target',()=>{
 const near=person('civ:near',40,0);
 const far=person('civ:far',110,0);
 assert.equal(knownCivilianInFireLane({x:0,y:0},26,
  {x:100,y:0},26,[far,near]),near);
 assert.equal(knownCivilianInFireLane({x:0,y:0},26,
  {x:60,y:0},26,[far]),null);
 assert.equal(knownCivilianInFireLane({x:0,y:0},26,
  {x:100,y:0},26,[person('civ:off',40,40)]),null);
});
test('E5-D2 lowered and standing civilian use real vertical hit volume',()=>{
 const hiding=person('civ:hide',35,0,'hiding');
 assert.equal(knownCivilianInFireLane({x:0,y:0},40,
  {x:70,y:0},40,[hiding]),null);
 assert.equal(knownCivilianInFireLane({x:0,y:0},18,
  {x:70,y:0},18,[hiding]),hiding);
});
test('E5-D2 filtering observed people never changes physical shot damage',()=>{
 const unseen=person('civ:unseen',35,0);
 const from={x:0,y:0},to={x:70,y:0};
 // A caller has not observed this person: empty awareness input.
 assert.equal(knownCivilianInFireLane(from,26,to,26,[]),null);
 // A fired round still intersects the actual unknown physical person.
 assert.equal(firstCivilianAlongRay(from,0,70,[unseen],{
  muzzleHeight:26,farHeight:26,farDistance:70
 })?.actor,unseen);
});
