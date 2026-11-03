import test from 'node:test';
import assert from 'node:assert/strict';
import {simplifyStrokePoints} from '../src/ui/touch-hit-targets.ts';
import {initDoor,advanceDoor,pushDoor,PUSHED_OPEN_LIMIT,
  initialOpeningYieldCandidate} from '../src/breach-door.ts';
import {COVER,pointToSegment,doorLeafSegment,OPERATOR_RADIUS}
  from '../src/breach-core.ts';
import {slideAroundStaticCorner,sweptBodyClear}
  from '../src/breach-navigation.ts';

const project=point=>point;
test('a straight finger drag is a single move destination',()=>{
  const points=Array.from({length:45},(_,i)=>({x:i*5,y:Math.sin(i*.4)}));
  const result=simplifyStrokePoints(points,project,15);
  assert.equal(result.length,2);
  assert.deepEqual(result.at(-1),points.at(-1));
});
test('corners survive simplification while intermediate samples do not',()=>{
  const points=[
    ...Array.from({length:21},(_,i)=>({x:i*5,y:0})),
    ...Array.from({length:20},(_,i)=>({x:100,y:(i+1)*5}))
  ];
  const result=simplifyStrokePoints(points,project,15);
  assert.equal(result.length,3);
  assert.deepEqual(result[1],{x:100,y:0});
  assert.deepEqual(result.at(-1),{x:100,y:100});
});
test('known impassable shortcuts retain enough drawn detail',()=>{
  const points=Array.from({length:11},(_,i)=>({x:i*10,y:0}));
  const result=simplifyStrokePoints(points,project,15,
    (a,b)=>b.x-a.x<=25);
  assert.ok(result.length>=5);
  for(let i=1;i<result.length;i++)
    assert.ok(result[i].x-result[i-1].x<=25);
});
test('normal OPEN stops near 90 degrees, shoulder PUSH extends but stays under 120',()=>{
  const door=initDoor({id:'REGRESSION-DOOR',a:{x:500,y:400},
    b:{x:540,y:400},open:false,openedAt:0},0);
  door.open=true;
  for(let i=0;i<100;i++)advanceDoor(door,1/60,[]);
  assert.ok(door.openFraction>=.98&&door.openFraction<=1.005);
  pushDoor(door,2.5);
  for(let i=0;i<100;i++)advanceDoor(door,1/60,[]);
  assert.ok(door.openFraction>1.04);
  assert.ok(door.openFraction<=PUSHED_OPEN_LIMIT+.0001);
  assert.ok(PUSHED_OPEN_LIMIT*1.54<2.1);
});
test('opening yield is only a small step away from the first leaf sweep',()=>{
  const d=initDoor({id:'YIELD-DOOR',a:{x:500,y:400},
    b:{x:540,y:400},open:true,openedAt:0},0);
  d.openFraction=.12;d.pushTarget=1;
  const leaf=doorLeafSegment({...d,openFraction:.185});
  const cx=(leaf.a.x+leaf.b.x)/2,cy=(leaf.a.y+leaf.b.y)/2;
  const dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y;
  const len=Math.hypot(dx,dy);
  const candidates=[-1,1].flatMap(sign=>
    [OPERATOR_RADIUS+1,OPERATOR_RADIUS+2].map(offset=>
      ({x:cx+sign*(-dy)/len*offset,y:cy+sign*dx/len*offset})));
  const near=candidates.find(p=>initialOpeningYieldCandidate(d,p));
  assert.ok(near,'an actor near the initial door sweep should have a yield direction');
  const proposed=initialOpeningYieldCandidate(d,near);
  assert.ok(proposed);
  assert.ok(Math.hypot(proposed.x-near.x,proposed.y-near.y)<=1.401);
  assert.ok(pointToSegment(proposed,leaf)>pointToSegment(near,leaf));
  assert.equal(initialOpeningYieldCandidate({...d,openFraction:.75},near),null);
});
test('static corner steering makes a real clear step, without touching furniture',()=>{
  const fixture={x:100,y:100,w:30,h:30,low:false};
  COVER.push(fixture);
  try{
    const start={x:76,y:76},attempt={x:78,y:78},goal={x:84,y:110};
    assert.equal(sweptBodyClear(start,attempt,[]),false);
    const slide=slideAroundStaticCorner(start,attempt,goal,[]);
    assert.ok(slide);
    assert.ok(sweptBodyClear(start,slide,[]));
    assert.ok(Math.hypot(slide.x-goal.x,slide.y-goal.y)<
      Math.hypot(start.x-goal.x,start.y-goal.y));
  }finally{COVER.splice(COVER.indexOf(fixture),1);}
});
