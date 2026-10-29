import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newSession,team,planMove,planPieAt,editPie,doorAtNode,
 undoPlan,stepSession,toggling,
} from '../src/breach-game.ts';
import {validPieArc,pieArc} from '../src/breach-maneuvers.ts';

test('065: arbitrary non-door pivot and independently chosen sweep degrees',()=>{
  const s=newSession(),a=team(s)[0];
  const pivot={x:325,y:599};
  assert.ok(planPieAt(s,'rook',pivot,'ccw',65),
    'pie can be centered on any physically valid world point');
  const node=a.plan[0];
  assert.equal(node.kind,'pie');
  assert.deepEqual(node.pivot,pivot);
  assert.equal(node.pieDegrees,65);
  assert.ok(node.arc.length>=10,'longer sweep generates more motor steps');
  assert.notDeepEqual(node.p,{x:303,y:532},'not locked to door center');
  const former=node.arc.map(p=>({...p}));
  assert.ok(editPie(s,'rook',node.id,pivot,80));
  assert.equal(a.plan[0].pieDegrees,80);
  assert.notDeepEqual(a.plan[0].arc,former);
  assert.ok(undoPlan(s,'rook'));
  assert.equal(a.plan[0].pieDegrees,65);
});
test('065: physical pivot sweep rejects blocked routes and excessive radii',()=>{
  const s=newSession();
  const pivot={x:325,y:599};
  assert.ok(pieArc(team(s)[0].p,pivot,'cw',80).length>9);
  assert.deepEqual(pieArc(team(s)[0].p,{x:620,y:100},'cw',80),[]);
  assert.deepEqual(validPieArc({x:382,y:342},{x:383,y:342},
    'cw',s.doors,80),[]);
});
test('064: contextual door orders attach to selected planned position',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:302,y:505}));
  const first=a.plan[0].id;
  assert.ok(doorAtNode(s,'rook','FRONT','kick',first));
  assert.equal(a.plan.length,2);
  assert.equal(a.plan[1].doorId,'FRONT');
  assert.equal(a.plan[1].method,'kick');
  assert.equal(a.plan[1].kind,'door');
  assert.ok(!doorAtNode(s,'rook','INNER','open',first),
    'faraway doorway must not be offered from the planned node');
  assert.ok(undoPlan(s,'rook'));
  assert.equal(a.plan.length,1,'door insertion is one undoable operation');
});
test('066-068: camera and presentation cannot mutate tactical time',()=>{
  const s=newSession();
  const first=team(s)[0].p;
  assert.equal(s.seconds,0);
  const content=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.match(content,/class TacticalScene3D/);
  assert.match(content,/OrthographicCamera/);
  assert.match(content,/mode:'iso'/);
  assert.match(content,/liveVisibility\(s,p\)/);
  assert.match(content,/isSeen\(s,actor\)/);
  assert.deepEqual(team(s)[0].p,first);
  stepSession(s,1/60);assert.equal(s.seconds,0);
  toggling(s);stepSession(s,1/60);
  assert.ok(s.seconds>0);
});
test('064,067: controls are contextual, accessible and camera-aware',()=>{
  const html=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  for(const id of ['contextTools','viewIso','viewTop','view2d',
    'rotLeft','rotRight','moreOrders','advancedOrders'])
    assert.ok(html.includes('id="'+id+'"'),'missing '+id);
  assert.match(main,/doorAtNode\(state,selected/);
  assert.match(main,/stage\.screenToWorld/);
  assert.match(main,/renderProjectedPlans\(\)/);
  assert.match(main,/editPie\(state,selected/);
});
