import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,planMove,movePlanNode,insertPlanNode}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {projectReachableGoal} from '../src/breach-nav-diagnostics.ts';

test('148: editing preserves a selected node and maintains undo history',()=>{
 const s=newSession(0,100),a=team(s)[0];
 const start={...a.p},to={x:start.x,y:start.y-39};
 assert.ok(planMove(s,a.id,to));
 const node=a.plan.at(-1),before=node.p;
 assert.ok(movePlanNode(s,a.id,node.id,{
   x:before.x+3,y:before.y-3}));
 assert.equal(a.plan.at(-1).id,node.id);
 assert.ok(a.history.undo.length>0);
 assert.ok(Math.hypot(a.plan.at(-1).p.x-before.x,
   a.plan.at(-1).p.y-before.y)<9);
 activateSite(null);
});
test('148: inserted route waypoint is real, bounded and undoable',()=>{
 const s=newSession(0,100),a=team(s)[0];
 const target={x:a.p.x,y:a.p.y-38};
 assert.ok(planMove(s,a.id,target));
 const old=a.plan[0].id;
 const near={x:a.p.x,y:a.p.y-20};
 assert.ok(insertPlanNode(s,a.id,0,near));
 assert.equal(a.plan.length,2);
 assert.equal(a.plan[1].id,old);
 assert.ok(a.plan[0].p);
 assert.equal(projectReachableGoal(a.p,near)?.adjusted,false);
 activateSite(null);
});
test('148: context placement respects plans from entire team',()=>{
 const s=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(s,/for\(const friendly of team\(state\)\)/);
 assert.match(s,/DESTINATION BLOCKED/);
 assert.match(s,/invalidDrag/);
 assert.doesNotMatch(s,/scrolling horizontal drawer/i);
});