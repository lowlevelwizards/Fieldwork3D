import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  W,H,WALLS,COVER,initialDoors,newTacticalState,route,passable,
  isClear,queueWaypoint,clearPath,setLook,step,sees,toggleExecution,
  own,hostiles,doorCenter,pointToSegment,
} from '../src/breach-core.ts';

test('052: original small building and intact physical door gaps',()=>{
  assert.equal(W,640);assert.equal(H,740);
  assert.ok(WALLS.length>=8);assert.ok(COVER.length>=4);
  const doors=initialDoors();
  assert.equal(doors.length,2);
  for(const d of doors){
    const center=doorCenter(d);
    assert.equal(passable(center),true,d.id+' must be traversable once opened');
    assert.equal(d.open,false);
  }
  assert.equal(passable({x:112,y:252}),false,'wall is solid');
  assert.equal(passable({x:210,y:310}),true,'open floor is walkable');
  assert.ok(pointToSegment({x:12,y:10},{a:{x:0,y:0},b:{x:20,y:0}})>9);
});
test('052: A* creates a physically walkable route through the front door',()=>{
  const start={x:282,y:628},inside={x:213,y:305};
  const path=route(start,inside);
  assert.ok(path.length>3,'should bend around physical obstacles');
  assert.deepEqual(path.at(-1),inside);
  for(const p of path)assert.equal(passable(p),true);
  assert.ok(path.some(p=>p.y<532)&&path.some(p=>p.y>532));
});
test('052: sealed doors obstruct sight until physically opened',()=>{
  const doors=initialDoors();
  const a={x:304,y:558},b={x:302,y:501};
  assert.equal(isClear(a,b,doors),false);
  doors[0].open=true;
  assert.equal(isClear(a,b,doors),true);
});
test('052: independent operators retain editable plans and facing',()=>{
  const s=newTacticalState();
  assert.equal(s.phase,'planning');
  assert.equal(own(s).length,2);assert.equal(hostiles(s).length,2);
  assert.ok(queueWaypoint(s,'rook',{x:302,y:492}));
  assert.ok(queueWaypoint(s,'moss',{x:430,y:460}));
  assert.ok(own(s)[0].path.length>0&&own(s)[1].path.length>0);
  assert.equal(setLook(s,'rook',{x:330,y:640}),true);
  assert.equal(own(s)[0].aimLock,true);
  clearPath(s,'rook');
  assert.equal(own(s)[0].path.length,0);
  assert.ok(own(s)[1].path.length>0);
});
test('052: planning freezes time, executing advances and can be paused',()=>{
  const s=newTacticalState();
  step(s,1/60);assert.equal(s.seconds,0);
  const before={...own(s)[0].p};
  assert.ok(queueWaypoint(s,'rook',{x:302,y:490}));
  toggleExecution(s);assert.equal(s.phase,'running');
  for(let i=0;i<20;i++)step(s,1/60);
  assert.ok(s.seconds>.3);assert.notDeepEqual(own(s)[0].p,before);
  toggleExecution(s);const frozen=s.seconds;
  for(let i=0;i<15;i++)step(s,1/60);
  assert.equal(s.seconds,frozen);
});
test('052: hidden contacts require physically unobstructed directional sight',()=>{
  const s=newTacticalState();
  const rook=own(s)[0],enemy=hostiles(s)[0];
  assert.equal(sees(rook,enemy,s),false);
  assert.equal(s.spotted.size,0);
  // Place two actors in same open room, and aim directly.
  rook.p={x:196,y:338};rook.heading=0;
  enemy.p={x:246,y:338};
  assert.equal(sees(rook,enemy,s),true);
  s.doors[0].open=true;
});
test('052: breach actions have deterministic victory and defeat outcomes',()=>{
  const win=newTacticalState();toggleExecution(win);
  hostiles(win).forEach(a=>a.health=0);step(win,1/60);
  assert.equal(win.phase,'won');
  const loss=newTacticalState();toggleExecution(loss);
  own(loss).forEach(a=>a.health=0);step(loss,1/60);
  assert.equal(loss.phase,'lost');
});
test('052: new game does not import old simulation, preserves legacy entries',()=>{
  const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  const src=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  const page=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
  assert.ok(vite.includes("breach: 'breach.html'"));
  assert.ok(vite.includes("world: 'world.html'"));
  assert.ok(vite.includes("study: 'study.html'"));
  assert.ok(page.includes('id="breachCanvas"'));
  assert.ok(src.includes("from './breach-core.ts'"));
  assert.ok(!src.includes('newOperation'));
  assert.ok(!src.includes('regional-terrain'));
  assert.ok(page.includes('id="play"'));
});