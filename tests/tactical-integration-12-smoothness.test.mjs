import test from 'node:test';
import assert from 'node:assert/strict';
import {WALLS,COVER,activateSite,passable,pointToSegment,doorLeafSegment}
 from '../src/breach-core.ts';
import {glideAlongStaticWall,sweptBodyClear,escapeOpenDoorOverlap,bodyClear}
 from '../src/breach-navigation.ts';
import {newSession,team,planMove,planMoveStroke,undoPlan,redoPlan}
 from '../src/breach-game.ts';
import {copyNodes} from '../src/breach-plan.ts';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const level={
 seed:867,name:'SMOOTHNESS REGRESSIONS',training:true,layout:'corridor',
 rooms:[],roomCount:0,doors:[],cover:[],walls:[],windows:[],
 enemies:[],entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:125,y:210},{x:135,y:235},{x:140,y:255}],
 objective:{x:240,y:120},extract:{x:245,y:120},
 bounds:{minX:0,minY:0,maxX:420,maxY:320}
};

test('wall glide preserves intended progress in both forward and reverse',()=>{
 const beforeWalls=[...WALLS],beforeCover=[...COVER];
 try{
  WALLS.splice(0,WALLS.length,{a:{x:100,y:60},b:{x:100,y:250}});
  COVER.splice(0,COVER.length);
  const from={x:109.8,y:160};
  for(const to of [{x:108,y:163.8},{x:108,y:156.2}]){
   assert.equal(sweptBodyClear(from,to,[]),false);
   const step=glideAlongStaticWall(from,to,[]);
   assert.ok(step,'a grazing shoulder should slide, not stall');
   assert.equal(sweptBodyClear(from,step,[]),true);
   const intent={x:to.x-from.x,y:to.y-from.y};
   const projection=((step.x-from.x)*intent.x+
     (step.y-from.y)*intent.y)/distance(from,to);
   assert.ok(projection>=distance(from,to)*.18,
    'an apparent glide should have measurable progress along intent');
   assert.ok((step.y-from.y)*(to.y-from.y)>0,
     'wall sliding must never flip an authored travel direction');
  }
  assert.equal(glideAlongStaticWall(from,{x:104,y:160},[]),null,
   'perpendicular obstruction must trigger recovery, not fake movement');
 }finally{
  WALLS.splice(0,WALLS.length,...beforeWalls);
  COVER.splice(0,COVER.length,...beforeCover);
 }
});

test('a closed hinged leaf can release an embedded operator without ghosting',()=>{
 const door={id:'CLOSED-LEAF',a:{x:290,y:260},b:{x:332,y:260},
  open:false,openFraction:0,hinge:'a',swing:-1,kind:'hinged'};
 activateSite({...level,seed:868,doors:[door]});
 try{
  const leaf=doorLeafSegment(door);
  let p={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
  const start={...p},goal={x:311,y:235};
  assert.equal(bodyClear(p,[door]),false);
  let steps=0;
  while(!bodyClear(p,[door])&&steps++<16){
   const next=escapeOpenDoorOverlap(p,goal,[door],1.35);
   assert.ok(next,'closed hinge must not permanently trap its overlap');
   assert.ok(distance(p,next)<=1.351,'recovery must use a tiny physical step');
   assert.ok(sweptBodyClear(p,next,[door]),'no collision bypass');
   assert.ok(pointToSegment(next,leaf)>pointToSegment(p,leaf),
    'only move outward from the leaf');
   assert.ok(passable(next));
   p=next;
  }
  assert.equal(bodyClear(p,[door]),true);
  assert.ok(distance(start,p)<18,'bounded release is not a teleport');
  // A legitimate closed leaf is otherwise still an actual obstacle.
  assert.equal(sweptBodyClear({x:310,y:244},{x:310,y:276},[door]),false);
 }finally{activateSite(null);}
});

test('HERE stroke with valid middle and invalid final destination is atomic',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',level);
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,{x:185,y:140}));
  assert.ok(planMove(s,a.id,{x:224,y:169}));
  const before=copyNodes(a.plan),oldNext=s.nextId;
  assert.equal(planMoveStroke(s,a.id,
    [{x:146,y:148},{x:182,y:176},{x:-35,y:-60}],false,true),false);
  assert.deepEqual(a.plan,before);
  assert.equal(s.nextId,oldNext,'rejected gesture must not spend order IDs');
  assert.equal(undoPlan(s,a.id),true,'previous real edit remains undoable');
  assert.ok(redoPlan(s,a.id),'previous real edit remains redoable');
  assert.deepEqual(a.plan,before);
 }finally{activateSite(null);}
});

test('appended stroke never silently stops at an earlier waypoint',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',level);
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,{x:160,y:120}));
  const before=copyNodes(a.plan);
  assert.equal(planMoveStroke(s,a.id,
    [{x:192,y:130},{x:235,y:146},{x:-30,y:400}],false,false),false);
  assert.deepEqual(a.plan,before);
  assert.ok(planMoveStroke(s,a.id,
    [{x:191,y:132},{x:234,y:149}],false,false));
  assert.ok(a.plan.at(-1).p.x>230,
    'valid release position must remain the actual authored destination');
  assert.ok(undoPlan(s,a.id),'one gesture should undo together');
  assert.deepEqual(a.plan,before);
 }finally{activateSite(null);}
});
