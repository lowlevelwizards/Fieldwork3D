import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planWaitAt,undoPlan,redoPlan} from '../src/breach-game.ts';
test('authored plan history preserves one committed edit per transaction',()=>{
 const s=newSession(),a=team(s)[0],before=a.plan.length;
 assert.ok(planWaitAt(s,a.id,1,'here'));
 assert.equal(a.plan.length,before+1);
 assert.ok(undoPlan(s,a.id));assert.equal(a.plan.length,before);
 assert.equal(a.activeNode,-1);
 assert.ok(redoPlan(s,a.id));assert.equal(a.plan.length,before+1);
 assert.equal(a.activeNode,-1);
});
