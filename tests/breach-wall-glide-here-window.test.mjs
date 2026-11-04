import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WALLS,COVER,activateSite,passable}
 from '../src/breach-core.ts';
import {glideAlongStaticWall,releaseStaticWallOverlap,sweptBodyClear}
 from '../src/breach-navigation.ts';
import {newSession,planMove,planMoveStroke,undoPlan,redoPlan,
 team,toggling,stepSession} from '../src/breach-game.ts';
import {copyNodes} from '../src/breach-plan.ts';
import {initializeWindows} from '../src/breach-windows.ts';
import {windowClimbAvailability,canOpenWindowForClimb,
 probeWindowCrossing} from '../src/breach-mantle.ts';

const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const stage={
 seed:758,name:'WALL / ROUTE / WINDOW REGRESSION',layout:'corridor',
 training:true,rooms:[],roomCount:0,doors:[],cover:[],walls:[],
 entrance:{x:120,y:120},spawn:[
 {x:120,y:120},{x:115,y:220},{x:135,y:240},{x:145,y:260}],
 enemies:[],windows:[],objective:{x:230,y:120},
 extract:{x:230,y:120},bounds:{minX:0,minY:0,maxX:400,maxY:320}
};
test('walking both directions alongside a wall glides, without any radius reduction',()=>{
 const oldWalls=[...WALLS],oldCover=[...COVER];
 try{
  WALLS.splice(0,WALLS.length,{a:{x:100,y:60},b:{x:100,y:250}});
  COVER.splice(0,COVER.length);
  const start={x:109.8,y:160};
  const forward={x:108,y:163.8},back={x:108,y:156.2};
  assert.equal(passable(start),true);
  assert.equal(sweptBodyClear(start,forward,[]),false);
  const advance=glideAlongStaticWall(start,forward,[]);
  const retreat=glideAlongStaticWall(start,back,[]);
  assert.ok(advance&&retreat,'should project either travel direction onto wall tangent');
  assert.ok(advance.y>start.y&&retreat.y<start.y);
  assert.ok(advance.x>=109&&retreat.x>=109,
    'full body must never clip through wall');
  assert.equal(sweptBodyClear(start,advance,[]),true);
  assert.equal(sweptBodyClear(start,retreat,[]),true);
  const forbidden=glideAlongStaticWall(start,{x:104,y:160},[]);
  if(forbidden){
    assert.ok(forbidden.x>start.x,'an inward push may only recover outward');
    assert.ok(sweptBodyClear(start,forbidden,[]));
  }
 }finally{
  WALLS.splice(0,WALLS.length,...oldWalls);
  COVER.splice(0,COVER.length,...oldCover);
 }
});
test('nearby wall never disguises a furniture collision as a wall glide',()=>{
 const oldWalls=[...WALLS],oldCover=[...COVER];
 try{
  WALLS.splice(0,WALLS.length,{a:{x:100,y:60},b:{x:100,y:250}});
  COVER.splice(0,COVER.length,
    {x:100,y:164,w:5,h:8,fixture:'shelf',low:false});
  const from={x:110.8,y:160},intoFurniture={x:109.8,y:162.4};
  assert.ok(passable(from));
  assert.equal(sweptBodyClear(from,intoFurniture,[]),false);
  // Neither end nor midpoint touches the full wall clearance.
  assert.equal(glideAlongStaticWall(from,intoFurniture,[]),null);
 }finally{
  WALLS.splice(0,WALLS.length,...oldWalls);
  COVER.splice(0,COVER.length,...oldCover);
 }
});
test('the motor reports resolved, not imagined wall-glide and corner-slide speed',()=>{
 const motor=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(motor,/a\.velocity=d\(old,glide\)\/Math\.max\(dt,\.0001\)/);
 assert.match(motor,/a\.velocity=d\(old,slide\)\/Math\.max\(dt,\.0001\)/);
});
test('a tiny static-wall overlap can escape outward without teleporting or rotating first',()=>{
 const oldWalls=[...WALLS],oldCover=[...COVER];
 try{
  WALLS.splice(0,WALLS.length,{a:{x:100,y:60},b:{x:100,y:250}});
  COVER.splice(0,COVER.length);
  const embedded={x:108.4,y:160};
  assert.equal(passable(embedded),false);
  const escaped=releaseStaticWallOverlap(embedded,{x:115,y:195},[],1.3);
  assert.ok(escaped);
  assert.ok(escaped.x>embedded.x,'should leave the wall, not press into it');
  assert.ok(d(embedded,escaped)<=1.401,'must be a small physical step');
  assert.equal(passable(escaped),true);
  // Facing isn't an input to releaseStaticWallOverlap; it cannot lock
  // escape movement just because the rig looks toward the wall.
 }finally{
  WALLS.splice(0,WALLS.length,...oldWalls);
  COVER.splice(0,COVER.length,...oldCover);
 }
});
test('HERE-origin drag replaces the entire route in one undo/redo gesture',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',stage);
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,{x:185,y:120}));
  assert.ok(planMove(s,a.id,{x:225,y:145}));
  const previous=copyNodes(a.plan);
  assert.ok(planMoveStroke(s,a.id,[{x:125,y:155},{x:165,y:181}],
    false,true));
  assert.equal(a.plan.length,2);
  assert.equal(a.plan[0].p.y,155);
  assert.ok(a.plan.every(n=>!previous.some(old=>old.id===n.id)));
  assert.ok(undoPlan(s,a.id));
  assert.deepEqual(a.plan,previous,'undo restores all replaced commands');
  assert.ok(redoPlan(s,a.id));
  assert.equal(a.plan.at(-1).p.y,181);
  // Ordinary append remains available via a deliberate endpoint command.
  assert.ok(planMoveStroke(s,a.id,[{x:202,y:193}],false,false));
  assert.equal(a.plan.length,3);
 }finally{activateSite(null);}
});
test('HERE replacement rejection never destroys existing orders',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',stage);
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,{x:180,y:180}));
  const before=structuredClone(a.plan);
  assert.equal(planMoveStroke(s,a.id,[{x:-60,y:-60}],false,true),false);
  assert.deepEqual(a.plan,before);
 }finally{activateSite(null);}
});
test('the touch gesture uses HERE replacement, not route-append',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(main,/planMoveStroke\(state,selected,points\.slice\(1\),false,true\)/);
 assert.match(main,/ROUTE REPLACED FROM HERE · UNDO TO RESTORE/);
});
test('window classification distinguishes standard sash from fixed and unsafe glazing',()=>{
 const fresh=initializeWindows([
  {id:'std',x:170,y:120,width:48,vertical:true,style:'standard',
   sillHeight:14,headHeight:38},
  {id:'picture',x:240,y:120,width:50,vertical:true,style:'picture',
   sillHeight:14,headHeight:38},
  {id:'upper',x:260,y:120,width:52,vertical:true,style:'clerestory',
   sillHeight:28,headHeight:39},
  {id:'bars',x:300,y:120,width:50,vertical:true,style:'standard',
   sillHeight:14,headHeight:38,treatment:'bars'},
  {id:'wire',x:320,y:120,width:50,vertical:true,style:'wire',
   sillHeight:14,headHeight:38}
 ]);
 assert.equal(windowClimbAvailability(fresh[0]),'open-first');
 assert.equal(canOpenWindowForClimb(fresh[0]),true);
 assert.equal(windowClimbAvailability(fresh[1]),'break-first');
 assert.equal(canOpenWindowForClimb(fresh[1]),false);
 assert.equal(windowClimbAvailability(fresh[2]),'blocked');
 assert.equal(windowClimbAvailability(fresh[3]),'blocked');
 assert.equal(windowClimbAvailability({...fresh[4],
   shattered:true,open:true}),'blocked','reinforcement persists');
});
const windowSite={
 ...stage,seed:759,
 cover:[{x:170,y:120,w:10,h:48,fixture:'window-sill',low:true}],
 walls:[
  {a:{x:170,y:20},b:{x:170,y:96}},
  {a:{x:170,y:144},b:{x:170,y:300}}
 ],
 windows:[{id:'W0',x:170,y:120,width:48,vertical:true,
   sillHeight:14,headHeight:38,style:'standard'}]
};
test('a closed standard window opens and is climbed automatically during MOVE',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',windowSite);
 try{
  const a=team(s)[0],goal={x:222,y:128},pane=s.windows[0];
  assert.equal(pane.open,false);
  assert.equal(windowClimbAvailability(pane),'open-first');
  assert.ok(planMove(s,a.id,goal),'the closed sash should be routable as an action');
  toggling(s);
  let opened=false,climbed=false,arrived=false;
  for(let i=0;i<1100;i++){
   stepSession(s,1/60);
   opened ||=pane.open;
   climbed ||=a.traversal?.kind==='climb-window';
   if(a.plan.length===0&&d(a.p,goal)<7){arrived=true;break;}
  }
  assert.equal(opened,true,'standard sash must open automatically');
  assert.equal(climbed,true,'a window crossing should execute, not route around');
  assert.equal(arrived,true,'actor must reach ground beyond the pane');
 }finally{activateSite(null);}
});
test('an angled destination finds the real center of a usable window',()=>{
 const w={id:'W',x:170,y:120,width:48,vertical:true,
  sillHeight:14,headHeight:38,style:'standard',
  open:true,shattered:false,operable:true,integrity:2};
 const cover=[{x:170,y:120,w:10,h:48,fixture:'window-sill',low:true}];
 const op=probeWindowCrossing({x:120,y:102},{x:223,y:151},
  {cover,walls:[],doors:[],windows:[w]});
 assert.ok(op);
 assert.equal(op.approach.y,120);
 assert.equal(op.landing.y,120);
 assert.ok(d(op.approach,op.landing)<45);
});
