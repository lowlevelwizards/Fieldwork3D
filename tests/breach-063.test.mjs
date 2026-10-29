import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newSession,team,enemies,planMove,planMoveStroke,planDoor,planPie,
  planSync,backOne,undoPlan,redoPlan,planLook,setStrafe,
  toggling,stepSession,movePlanNode,deletePlanNode,
} from '../src/breach-game.ts';
import {pieArc,validPieArc,PIE_STEPS} from '../src/breach-maneuvers.ts';
import {doorCenter} from '../src/breach-core.ts';

const run=(s,seconds)=>{for(let i=0;i<seconds*60;i++)stepSession(s,1/60);};
test('063: BACK removes exactly the last authored order, never the whole route',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:301,y:589}));
  assert.ok(planMove(s,'rook',{x:305,y:560}));
  assert.ok(planMove(s,'moss',{x:348,y:592}));
  const first=a.plan[0].id,second=a.plan[1].id;
  assert.ok(backOne(s,'rook'));
  assert.deepEqual(a.plan.map(n=>n.id),[first]);
  assert.equal(team(s)[1].plan.length,1,'other operator unaffected');
  assert.ok(undoPlan(s,'rook'),'one-step deletion is undoable');
  assert.deepEqual(a.plan.map(n=>n.id),[first,second]);
  assert.ok(redoPlan(s,'rook'),'redo reapplies one deletion only');
  assert.deepEqual(a.plan.map(n=>n.id),[first]);
  assert.ok(backOne(s,'rook'));
  assert.equal(a.plan.length,0);
  assert.equal(backOne(s,'rook'),false,'no negative-action underflow');
});
test('063: one long drawn stroke is one UNDO while BACK removes one waypoint',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:300,y:598}));
  const keep=a.plan[0].id;
  assert.ok(planMoveStroke(s,'rook',[
    {x:301,y:574},{x:301,y:543},{x:304,y:506},{x:302,y:486},
  ]));
  const strokeLength=a.plan.length;
  assert.ok(strokeLength>=3);
  assert.ok(backOne(s,'rook'));
  assert.equal(a.plan.length,strokeLength-1,'single end node removed');
  assert.ok(undoPlan(s,'rook'));
  assert.equal(a.plan.length,strokeLength);
  assert.ok(undoPlan(s,'rook'),'next history entry reverses the whole drawing gesture');
  assert.deepEqual(a.plan.map(n=>n.id),[keep]);
});
test('063: the synchronized pair cannot become an orphaned wait after BACK',()=>{
  const s=newSession();
  assert.ok(planSync(s));
  assert.equal(team(s)[0].plan[0].kind,'sync');
  assert.equal(team(s)[1].plan[0].kind,'sync');
  assert.ok(backOne(s,'rook'));
  assert.equal(team(s)[0].plan.length,0);
  assert.equal(team(s)[1].plan.length,0,'companion synchronization removed');
});
test('063: strafe is a reversible per-segment intent with chosen facing',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:340,y:618}));
  const id=a.plan[0].id;
  assert.ok(setStrafe(s,'rook',id));
  assert.equal(a.plan[0].moveMode,'strafe');
  assert.ok(planLook(s,'rook',{x:282,y:495},id));
  const facing=a.plan[0].facing;
  assert.ok(Number.isFinite(facing));
  // End route is eastwards. Weapon should look towards north, not east.
  enemies(s).forEach(a=>a.health=0);
  toggling(s);run(s,.37);
  assert.ok(a.p.x>282,'strafe still translates toward destination');
  assert.ok(Math.abs(a.heading-facing)<.9,'weapon turns toward assigned direction');
  toggling(s);
  assert.ok(setStrafe(s,'rook',id));
  assert.equal(a.plan[0].moveMode,'advance');
});
test('063: pie preview is a physical arc, not a ray crossing a sealed wall',()=>{
  const s=newSession(),start={x:302.5,y:591};
  const door=s.doors[0],pivot=doorCenter(door);
  const cw=validPieArc(start,pivot,'cw',s.doors);
  const ccw=validPieArc(start,pivot,'ccw',s.doors);
  assert.equal(cw.length,PIE_STEPS);
  assert.equal(ccw.length,PIE_STEPS);
  assert.ok(cw.at(-1).x<start.x);
  assert.ok(ccw.at(-1).x>start.x);
  const long=pieArc({x:302.5,y:732},pivot,'cw');
  assert.deepEqual(long,[],'sweep from across the map is forbidden');
  assert.deepEqual(validPieArc({x:381,y:325},{x:382,y:325},'cw',s.doors),[]);
});
test('063: one pie node generates many controlled motor steps and undoes atomically',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planPie(s,'rook','FRONT','ccw'));
  assert.equal(a.plan.length,1,'pie is one authored order');
  const node=a.plan[0];
  assert.equal(node.kind,'pie');assert.equal(node.arc.length,PIE_STEPS);
  assert.ok(a.path.length>=PIE_STEPS,'generated motor path contains the arc');
  const end={...node.p};
  assert.ok(backOne(s,'rook'));
  assert.equal(a.plan.length,0);
  assert.ok(undoPlan(s,'rook'));
  assert.equal(a.plan.length,1);
  enemies(s).forEach(e=>e.health=0);
  toggling(s);run(s,14);
  assert.equal(a.plan.length,0,'sweep completes');
  assert.ok(Math.hypot(a.p.x-end.x,a.p.y-end.y)<6,'ends at planned arc endpoint');
});
test('063: editing preceding points revalidates pie geometry, no stale arc',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:302,y:591}));
  assert.ok(planPie(s,'rook','FRONT','ccw'));
  const endpoint={...a.plan[1].p},id=a.plan[0].id;
  assert.equal(movePlanNode(s,'rook',id,{x:280,y:700}),false,
    'moving previous node too far invalidates dependent sweep');
  assert.deepEqual(a.plan[1].p,endpoint,'rejected edit must be atomic');
  assert.equal(deletePlanNode(s,'rook',id),true,
    'deleting precursor is fine if arc can revalidate from current position');
  assert.equal(a.plan[0].kind,'pie');
});

test('063: undo after paired BACK cannot deadlock a lone synchronization',()=>{
  const s=newSession();
  assert.ok(planSync(s));
  assert.ok(backOne(s,'rook'));
  assert.ok(undoPlan(s,'rook'));
  assert.equal(team(s)[0].plan[0].kind,'sync');
  assert.equal(team(s)[1].plan.length,0);
  toggling(s);run(s,.2);
  assert.equal(team(s)[0].plan.length,0,'orphan code safely releases');
});
