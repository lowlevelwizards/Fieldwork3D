import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planAim,planWaitAt,setWaitDuration,
 setMoveSprint,undoPlan,redoPlan} from '../src/breach-game.ts';
test('130: current-position PIE prefaces the existing route',()=>{
 const s=newSession(0),a=team(s)[0],from={...a.p};
 assert.ok(planMove(s,a.id,{x:from.x+18,y:from.y}));
 const original=a.plan.map(n=>n.id);
 assert.ok(planAim(s,a.id,'track',{x:from.x+40,y:from.y+40},
    undefined,'pie','here'));
 assert.equal(a.plan[0].kind,'look');
 assert.deepEqual(a.plan[0].p,from);
 assert.deepEqual(a.plan.slice(1).map(n=>n.id),original);
 assert.equal(a.plan[0].aimMode,'track');
 assert.ok(undoPlan(s,a.id));assert.deepEqual(a.plan.map(n=>n.id),original);
 assert.ok(redoPlan(s,a.id));assert.equal(a.plan[0].kind,'look');
});
test('130: independent waits work before routes and after waypoints',()=>{
 const s=newSession(0),a=team(s)[0],other=team(s)[1];
 assert.ok(planWaitAt(s,a.id,2,'here'));
 assert.equal(a.plan[0].kind,'wait');assert.equal(a.plan[0].duration,2);
 assert.ok(planWaitAt(s,other.id,1,'here'));
 assert.equal(other.plan[0].duration,1);
 assert.ok(planMove(s,a.id,{x:a.p.x+18,y:a.p.y}));
 const waypoint=a.plan.at(-1);
 assert.ok(planWaitAt(s,a.id,3,'end',waypoint.id));
 assert.equal(a.plan.at(-1).duration,3);
 assert.ok(setWaitDuration(s,a.id,a.plan.at(-1).id,1));
 assert.equal(a.plan.at(-1).duration,1);
});
test('130: sprint is authored on an explicit move node',()=>{
 const s=newSession(0),a=team(s)[0];
 assert.ok(planMove(s,a.id,{x:a.p.x+18,y:a.p.y}));
 const id=a.plan.at(-1).id;
 assert.ok(setMoveSprint(s,a.id,id));
 assert.equal(a.plan.at(-1).moveMode,'sprint');
 assert.ok(setMoveSprint(s,a.id,id));
 assert.equal(a.plan.at(-1).moveMode,'advance');
});
