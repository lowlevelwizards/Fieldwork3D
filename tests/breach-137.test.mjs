import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planAim,planWaitAt,planHoldClear} from '../src/breach-game.ts';
test('137: route endpoint is default, explicit HERE preserves waypoints',()=>{
 const s=newSession(0),a=team(s)[0],p={x:a.p.x+20,y:a.p.y};
 assert.ok(planMove(s,a.id,p));const id=a.plan[0].id;
 assert.ok(planAim(s,a.id,'track',{x:p.x+10,y:p.y+22},undefined,'pie','end'));
 assert.deepEqual(a.plan[1].p,p);assert.equal(a.plan[0].id,id);
 assert.ok(planAim(s,a.id,'fixed',{x:a.p.x+12,y:a.p.y+20},undefined,'look','here'));
 assert.equal(a.plan[0].kind,'look');assert.equal(a.plan[1].id,id);
});
test('137: WAIT defaults to half-second and HOLD CLEAR is distinct',()=>{
 const s=newSession(0),a=team(s)[0];
 assert.ok(planWaitAt(s,a.id,.5,'here'));assert.equal(a.plan[0].duration,.5);
 assert.ok(planHoldClear(s,a.id,'end'));assert.equal(a.plan.at(-1).kind,'holdClear');
 assert.equal(a.plan.at(-1).duration,.5);
});
