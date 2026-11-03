import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,planWatch,stepSession,
  retargetActiveWatch,removeActiveWatch} from '../src/breach-game.ts';
import {activeWatchTarget} from '../src/ui/active-watch-marker.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

const target=(p)=>({x:p.x+65,y:p.y-45});
function executedWatch(){
  const s=newSession();
  const rook=team(s).find(a=>a.id==='rook');
  const point=target(rook.p);
  assert.ok(planWatch(s,'rook',point,undefined,'here'));
  s.phase='running';
  for(let i=0;i<25;i++)stepSession(s,1/60);
  assert.equal(rook.plan.some(n=>n.aimMode==='track'),false,
    'the authored WATCH waypoint should be consumed during execution');
  assert.deepEqual(activeWatchTarget(rook),point,
    'its persistent tracking point must survive without a queued node');
  s.phase='planning';
  return {s,rook,point};
}

test('active WATCH stays visible after its original waypoint executes',()=>{
  const {rook,point}=executedWatch();
  assert.deepEqual(activeWatchTarget(rook),point);
});

test('dragging an executed WATCH retargets only that operator, not the route',()=>{
  const {s,rook}=executedWatch();
  const queuedBefore=structuredClone(rook.plan);
  const updated=target({x:rook.p.x+9,y:rook.p.y+18});
  assert.equal(retargetActiveWatch(s,'rook',updated),true);
  assert.deepEqual(activeWatchTarget(rook),updated);
  assert.deepEqual(rook.plan,queuedBefore);
  const before=activeWatchTarget(rook);
  assert.equal(retargetActiveWatch(s,'rook',{...rook.p}),false);
  assert.deepEqual(activeWatchTarget(rook),before);
  s.phase='running';
  assert.equal(retargetActiveWatch(s,'rook',{x:200,y:200}),false);
});

test('DELETE WATCH releases tracking without deleting future movement orders',()=>{
  const {s,rook}=executedWatch();
  const before=structuredClone(rook.plan);
  assert.equal(removeActiveWatch(s,'rook'),true);
  assert.equal(activeWatchTarget(rook),null);
  assert.equal(rook.aimInstruction,null);
  assert.deepEqual(rook.plan,before);
  assert.equal(removeActiveWatch(s,'rook'),false);
});

test('WATCH marker hides after releasing, running or incapacitation',()=>{
  const {rook,point}=executedWatch();
  assert.deepEqual(activeWatchTarget(rook),point);
  rook.pace='run';assert.equal(activeWatchTarget(rook),null);
  rook.pace='walk';rook.health=0;
  assert.equal(activeWatchTarget(rook),null);
  rook.health=4;rook.aimInstruction={mode:'fixed',angle:0};
  assert.equal(activeWatchTarget(rook),null);
});

test('rewinding and scrubbing replay restores the actual active target',()=>{
  const {s,rook,point}=executedWatch();
  const frame=snapshot(s);
  rook.aimInstruction=null;
  applyReplayFrame(s,frame);
  assert.deepEqual(activeWatchTarget(rook),point);
  const saved=frame.actors.find(a=>a.id==='rook').aimInstruction.point;
  assert.notEqual(saved,rook.aimInstruction.point,
    'replay must not alias mutable target points');
});

test('2D and 3D use persistent marker; touch selects, drags and deletes it',()=>{
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  assert.match(main,/function drawActiveWatchMarker\(/);
  assert.ok((main.match(/if\(activeTarget\)drawActiveWatchMarker/g)||[]).length>=2);
  assert.match(main,/marker:'activeWatch'/);
  assert.match(main,/p\.mode==='activeWatch'/);
  assert.match(main,/retargetActiveWatch\(state,selected,pt\)/);
  assert.match(main,/selectedActiveWatch\)removeActiveWatch\(state,selected\)/);
  assert.match(main,/label:'DELETE WATCH'/);
});
