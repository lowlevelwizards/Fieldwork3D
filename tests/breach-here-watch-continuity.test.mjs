import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,planMove,planMoveStroke,planWatch,planAim,
  undoPlan,redoPlan} from '../src/breach-game.ts';
import {interruptsWatch} from '../src/breach-plan.ts';

const stage={
 seed:1807,name:'WATCH / HERE ROUTE CONTINUITY',layout:'corridor',
 training:true,rooms:[],roomCount:0,doors:[],cover:[],walls:[],
 entrance:{x:120,y:120},spawn:[
  {x:120,y:120},{x:115,y:220},{x:135,y:240},{x:145,y:260}],
 enemies:[],windows:[],objective:{x:230,y:120},
 extract:{x:230,y:120},bounds:{minX:0,minY:0,maxX:400,maxY:320}
};
const session=()=>newSession(0,undefined,'full-view','standard','hold',stage);
const stroke=[{x:145,y:150},{x:180,y:185}];
const visiblePlan=plan=>JSON.parse(JSON.stringify(plan));
const target={x:270,y:88};

test('HERE redraw retains the independent WATCH node/target, and is one undo',()=>{
 const s=session();
 try{
  const a=team(s)[0];
  assert.ok(planWatch(s,a.id,target,undefined,'here'));
  const watchId=a.plan[0].id;
  assert.ok(planMove(s,a.id,{x:196,y:130}));
  const oldMoveId=a.plan.at(-1).id;
  const before=visiblePlan(a.plan);
  assert.ok(planMoveStroke(s,a.id,stroke,false,true));
  assert.equal(a.plan[0].id,watchId,'same WATCH handle, not an invisible duplicate');
  assert.equal(a.plan[0].kind,'look');
  assert.equal(a.plan[0].aimMode,'track');
  assert.deepEqual(a.plan[0].aimPoint,target);
  assert.deepEqual(a.plan[0].p,a.p,'WATCH starts at HERE before new movement');
  assert.equal(a.plan.some(n=>n.id===oldMoveId),false);
  assert.equal(a.plan.filter(n=>n.kind==='move').length,2);
  const replacement=visiblePlan(a.plan);
  assert.ok(undoPlan(s,a.id));
  assert.deepEqual(visiblePlan(a.plan),before,
   'UNDO restores both old route and WATCH node');
  assert.ok(redoPlan(s,a.id));
  assert.deepEqual(visiblePlan(a.plan),replacement,
   'REDO retains WATCH and replacement path');
  assert.ok(planMoveStroke(s,a.id,[{x:178,y:149}],false,true));
  assert.equal(a.plan[0].id,watchId,'repeated HERE redraws preserve WATCH');
  assert.deepEqual(a.plan[0].aimPoint,target);
 }finally{activateSite(null);}
});

test('WATCH authored on an old movement waypoint survives as HERE instruction',()=>{
 const s=session();
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,{x:185,y:130}));
  const oldMoveId=a.plan[0].id;
  assert.ok(planWatch(s,a.id,target,oldMoveId));
  assert.ok(planMove(s,a.id,{x:210,y:170}));
  assert.ok(planMoveStroke(s,a.id,stroke,false,true));
  assert.equal(a.plan[0].id,oldMoveId);
  assert.equal(a.plan[0].kind,'look','stale movement geometry is discarded');
  assert.deepEqual(a.plan[0].p,a.p);
  assert.deepEqual(a.plan[0].aimPoint,target);
  assert.ok(a.plan.slice(1).every(n=>n.aimMode===undefined));
 }finally{activateSite(null);}
});

test('redraw does not overwrite an already-executed active WATCH',()=>{
 const s=session();
 try{
  const a=team(s)[0];
  a.aimInstruction={mode:'track',point:{...target}};
  assert.ok(planMove(s,a.id,{x:170,y:125}));
  assert.ok(planMoveStroke(s,a.id,stroke,false,true));
  assert.deepEqual(a.aimInstruction,{mode:'track',point:target});
  assert.equal(a.plan.some(n=>n.aimMode==='track'),false,
   'executed WATCH is kept in the operator state, not duplicated in queue');
 }finally{activateSite(null);}
});

test('explicit LOOK supersedes queued WATCH; invalid stroke never alters either',()=>{
 const s=session();
 try{
  const a=team(s)[0];
  assert.ok(planWatch(s,a.id,target,undefined,'here'));
  const before=structuredClone(a.plan),nextId=s.nextId;
  assert.equal(planMoveStroke(s,a.id,[{x:-80,y:-80}],false,true),false);
  assert.deepEqual(a.plan,before);
  assert.equal(s.nextId,nextId);
  assert.ok(planAim(s,a.id,'free',{x:225,y:220},undefined,'look','end'));
  assert.ok(planMoveStroke(s,a.id,stroke,false,true));
  assert.equal(a.plan.some(n=>n.aimMode==='track'),false,
   'a later explicit LOOK is an intentional WATCH override');
 }finally{activateSite(null);}
});

test('normal movement keeps WATCH; running and physical actions interrupt it',()=>{
 assert.equal(interruptsWatch({kind:'move',paceState:'walk'},'walk'),false);
 assert.equal(interruptsWatch({kind:'move'},'run'),true);
 assert.equal(interruptsWatch({kind:'move',paceState:'run'},'walk'),true);
 assert.equal(interruptsWatch({kind:'door'},'walk'),true);
 assert.equal(interruptsWatch({kind:'flash'},'walk'),true);
});
