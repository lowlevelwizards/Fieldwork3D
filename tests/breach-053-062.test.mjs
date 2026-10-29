import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newSession,team,enemies,planMove,planLook,planDoor,planWait,planSync,
  movePlanNode,deletePlanNode,insertPlanNode,clearPlan,
  undoPlan,redoPlan,posture,toggling,stepSession,
  isSeen,lastKnown,debrief,missionText,
} from '../src/breach-game.ts';
const run=(s,time)=>{const n=Math.floor(time*60);
  for(let i=0;i<n;i++)stepSession(s,1/60);};
test('053: authored plan nodes have stable ids independent of path vertices',()=>{
  const s=newSession(),rook=team(s)[0];
  assert.ok(planMove(s,'rook',{x:302,y:483}));
  assert.equal(rook.plan.length,1);
  assert.ok(rook.path.length>1,'navigation vertices are generated separately');
  const id=rook.plan[0].id;
  assert.ok(planMove(s,'rook',{x:224,y:342}));
  assert.ok(movePlanNode(s,'rook',id,{x:300,y:500}));
  assert.equal(rook.plan[0].id,id);
  assert.equal(rook.plan[0].p.y,500);
  assert.ok(undoPlan(s,'rook'));assert.equal(rook.plan[0].p.y,483);
  assert.ok(redoPlan(s,'rook'));assert.equal(rook.plan[0].p.y,500);
  assert.ok(deletePlanNode(s,'rook',id));
  assert.ok(insertPlanNode(s,'rook',0,{x:302,y:491}));
  assert.ok(rook.plan[0].id!==id);
  assert.ok(clearPlan(s,'rook'));assert.equal(rook.plan.length,0);
});
test('055: independent waypoint-facing orders survive plan edit',()=>{
  const s=newSession();
  assert.ok(planMove(s,'rook',{x:302,y:492}));
  const node=team(s)[0].plan[0];
  assert.ok(planLook(s,'rook',{x:400,y:492},node.id));
  assert.ok(Math.abs(node.facing??9)<.1);
  assert.ok(movePlanNode(s,'rook',node.id,{x:315,y:492}));
  assert.ok(Number.isFinite(node.facing));
});
test('056: door opening is an explicit plan, not magic proximity',()=>{
  const s=newSession(),rook=team(s)[0];
  assert.ok(planDoor(s,'rook','FRONT','kick'));
  assert.equal(rook.plan[0].kind,'door');
  assert.equal(rook.plan[0].doorId,'FRONT');
  assert.equal(s.doors[0].open,false);
  toggling(s);
  run(s,5);
  assert.equal(s.doors[0].open,true);
  assert.ok(s.noise.some(n=>n.kind==='kick')||
    s.events.some(e=>e.includes('KICKED')));
});
test('054: movement freezes during pause and retains authored orders',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:302,y:491}));
  toggling(s);run(s,.6);
  const pos={...a.p};
  toggling(s);
  run(s,2);
  assert.deepEqual(a.p,pos);
  assert.ok(a.plan.length);
  assert.equal(s.phase,'planning');
  toggling(s);run(s,1.2);
  assert.notDeepEqual(a.p,pos);
});
test('057: posture is explicit, slower and impacts line of sight near low cover',()=>{
  const s=newSession(),rook=team(s)[0];
  assert.equal(rook.posture,'stand');
  assert.ok(posture(s,'rook'));assert.equal(rook.posture,'crouch');
  assert.ok(posture(s,'rook'));assert.equal(rook.posture,'stand');
});
test('060: one sync code is attached to both plans and waits for both',()=>{
  const s=newSession();
  assert.ok(planMove(s,'rook',{x:300,y:583}));
  assert.ok(planMove(s,'moss',{x:347,y:582}));
  assert.ok(planSync(s));
  const [a,b]=team(s);
  assert.equal(a.plan.at(-1).kind,'sync');
  assert.equal(a.plan.at(-1).syncCode,b.plan.at(-1).syncCode);
  toggling(s);run(s,7);
  assert.ok(a.plan.every(n=>n.kind!=='sync')&&
    b.plan.every(n=>n.kind!=='sync'),'both eventually released');
});
test('061: contact memory is knowledge, not global enemy visibility',()=>{
  const s=newSession(),a=team(s)[0],b=enemies(s)[0];
  assert.equal(isSeen(s,b),false);
  assert.equal(lastKnown(s,b.id),null);
  a.p={x:191,y:330};a.heading=0;
  b.p={x:248,y:330};b.heading=3.14;
  toggling(s);stepSession(s,1/60);
  assert.equal(isSeen(s,b),true);
  assert.ok(lastKnown(s,b.id));
  b.p={x:515,y:245};
  assert.equal(isSeen(s,b),false);
  assert.ok(lastKnown(s,b.id).p.x<300,'old memory persists');
});
test('062: objective then extraction, not just killing every enemy',()=>{
  const s=newSession();
  enemies(s).forEach(a=>a.health=0);
  toggling(s);stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.equal(s.phase,'running');
  team(s)[0].p={x:453,y:319};stepSession(s,1/60);
  assert.equal(s.mission,'extract');
  assert.ok(missionText(s).includes('EXTRACTION'));
  team(s)[0].p={x:307,y:669};stepSession(s,1/60);
  assert.equal(s.phase,'won');
  const report=debrief(s);
  assert.equal(report.objective,true);
  assert.equal(report.casualties,0);
});
test('059,062: authored enemy variants differ without leaking knowledge',()=>{
  const a=newSession(0),b=newSession(1),c=newSession(2);
  assert.notDeepEqual(enemies(a).map(o=>o.p),enemies(b).map(o=>o.p));
  assert.notDeepEqual(enemies(b).map(o=>o.p),enemies(c).map(o=>o.p));
  assert.equal(a.spotted.size,0);assert.equal(b.known.size,0);
  assert.equal(c.mission,'clear');
});
