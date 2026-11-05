import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {newSession,team,enemies} from '../src/breach-game.ts';
const fixture={id:'civil-42',role:'employee',persona:'cautious',
 activity:'working',position:{x:75,y:80},heading:1,
 roomId:'office',zoneId:'north',routine:[{x:75,y:80},{x:110,y:100}],
 appearanceSeed:882};
test('E5-B1 neutral has no weapon or enemy actor authority',()=>{
 const c=createCivilian(fixture);
 assert.equal(c.state,'routine');
 assert.equal(c.health,2);
 assert.equal('weapon' in c,false);
 assert.equal('side' in c,false);
 assert.equal('firePolicy' in c,false);
 assert.equal('targetId' in c,false);
 assert.notStrictEqual(c.p,fixture.position);
 c.routine[0].x=200;
 assert.equal(fixture.routine[0].x,75);
});
test('E5-B1 legacy session starts with zero neutrals and same combat actors',()=>{
 const s=newSession();
 assert.deepEqual(s.civilians,[]);
 assert.equal(team(s).length,2);
 assert.equal(enemies(s).length,2);
});
