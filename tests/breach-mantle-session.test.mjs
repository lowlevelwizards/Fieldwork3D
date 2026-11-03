import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,planMove,team,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {snapshot,applyReplayFrame,MissionRecorder}
 from '../src/breach-replay.ts';
import {traversalStepClear,probeWindowCrossing}
 from '../src/breach-mantle.ts';

const site={
 seed:451,name:'MANTLE MOTOR ACCEPTANCE',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[
  {a:{x:90,y:100},b:{x:250,y:100}},
  {a:{x:90,y:140},b:{x:250,y:140}}
 ],
 doors:[],cover:[{x:172,y:120,w:21,h:22,fixture:'crate',low:true}],
 entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:120,y:193},{x:120,y:220},{x:120,y:245}],
 enemies:[],windows:[],objective:{x:225,y:120},
 extract:{x:225,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:310}
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function begin(){
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const lead=team(s)[0],goal={x:222,y:120};
 assert.ok(planMove(s,lead.id,goal),'must author move across a known crate');
 toggling(s);
 return {s,lead,goal};
}
test('real fixed-step simulation crosses a single crate via timed vault',()=>{
 const {s,lead,goal}=begin();
 let sawPending=false,sawActive=false,peak=0,finished=false;
 try{
  for(let tick=0;tick<900;tick++){
   const before={...lead.p};
   stepSession(s,1/60);
   sawPending ||=!!lead.traversalPending;
   sawActive ||=!!lead.traversal;
   peak=Math.max(peak,lead.traversalElevation);
   if(lead.traversal&&distance(before,lead.p)>.001)
    assert.equal(traversalStepClear(before,lead.p,lead.traversal,{
     cover:s.coverState,walls:site.walls,doors:s.doors,
     canStand:p=>true
    }),true,'every authored motor step must be collision-checked');
   if(lead.plan.length===0&&distance(lead.p,goal)<7){
    finished=true;break;
   }
  }
  assert.equal(sawPending,true,'should queue a physical takeoff');
  assert.equal(sawActive,true,'must enter airborne motor state');
  assert.ok(peak>4,'3D must receive a non-zero authoritative lift');
  assert.ok(finished,'actor failed to reach the interior goal '+JSON.stringify({
   p:lead.p,goal,nav:lead.nav,blocked:lead.blockedTime,
   pending:lead.traversalPending,traversal:lead.traversal
  }));
 }finally{activateSite(null);}
});
test('snapshot, scrubbing and apply replay preserve the active vault trajectory',()=>{
 const {s,lead}=begin();
 try{
  const recorder=new MissionRecorder();
  let sawAir=false;
  for(let i=0;i<800;i++){
   stepSession(s,1/60);
   recorder.capture(s);
   if(lead.traversal&&lead.traversalElevation>4){sawAir=true;break;}
  }
  assert.ok(sawAir,'expected a real vault before testing replay');
  const frame=snapshot(s),recorded=frame.actors.find(x=>x.id===lead.id);
  assert.ok(recorded.traversal);
  assert.ok(recorded.traversalElevation>0);
  const original=recorded.traversal.approach.x;
  lead.traversal.approach.x=-333;
  assert.equal(recorded.traversal.approach.x,original,'replay must deep-copy positions');
  lead.traversal=null;lead.traversalElevation=0;
  applyReplayFrame(s,frame);
  assert.equal(lead.traversalElevation,recorded.traversalElevation);
  assert.equal(lead.traversal.approach.x,original);
 }finally{activateSite(null);}
});

test('real operator climbs a suitable opened window; closed pane stays impassable',()=>{
 const facade={
  ...site,
  seed:454,
  cover:[{x:170,y:120,w:10,h:48,fixture:'window-sill',low:true}],
  walls:[
   {a:{x:170,y:35},b:{x:170,y:96}},
   {a:{x:170,y:144},b:{x:170,y:260}}
  ],
  windows:[{id:'W0',x:170,y:120,width:48,vertical:true,
   sillHeight:14,headHeight:38,style:'standard',treatment:'none'}]
 };
 const closed=newSession(0,undefined,'full-view','standard','hold',facade);
 try{
  const w=closed.windows[0],start={...team(closed)[0].p};
  assert.equal(w.open,false);
  // Test the pane state independently of reaching it: closed means no
  // physically permitted climb even if route planner sees the sill.
  assert.equal(probeWindowCrossing(start,{x:223,y:120},{
   cover:closed.coverState,walls:facade.walls,doors:[],
   windows:closed.windows,canStand:p=>true
  }),null);
  w.open=true;
  const lead=team(closed)[0],goal={x:223,y:120};
  assert.ok(planMove(closed,lead.id,goal),
   'open window should make an authored landing feasible');
  toggling(closed);
  let climbed=false,completed=false;
  for(let i=0;i<1100;i++){
   stepSession(closed,1/60);
   climbed ||=lead.traversal?.kind==='climb-window';
   if(lead.plan.length===0&&distance(lead.p,goal)<7){
    completed=true;break;
   }
  }
  assert.ok(climbed,'operator did not begin the approved window climb');
  assert.ok(completed,'window climb did not reach a safe landing '+JSON.stringify({
    p:lead.p,goal,blocked:lead.lastBlocker,nav:lead.nav
  }));
 }finally{activateSite(null);}
});
