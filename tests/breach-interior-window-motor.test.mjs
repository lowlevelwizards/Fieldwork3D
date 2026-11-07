import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,plannedWindowRoute,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const site={
 seed:14555,name:'BROKEN INTERIOR WINDOW PORTAL',layout:'office',
 training:true,rooms:[],roomCount:0,
 walls:[
  {a:{x:170,y:20},b:{x:170,y:88}},
  {a:{x:170,y:152},b:{x:170,y:300}}
 ],
 doors:[],cover:[{x:170,y:120,w:10,h:64,low:true,fixture:'window-sill'}],
 entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:70,y:60},{x:70,y:180},{x:75,y:240}],
 enemies:[],windows:[{
  id:'IW0',x:170,y:120,width:64,vertical:true,interior:true,
  style:'picture',sillHeight:13,headHeight:49
 }],
 objective:{x:275,y:215},extract:{x:120,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:330}
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('broken interior glass beats detour and operator physically climbs to off-axis goal',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const lead=team(s)[0],goal={x:267,y:210};
  const pane=s.windows[0];
  assert.equal(pane.operable,false,'interior picture glass is fixed when intact');
  pane.open=true;pane.shattered=true;pane.integrity=0;
  const visualRoute=plannedWindowRoute(s,lead.p,goal);
  assert.ok(visualRoute?.some(p=>p.x>170),'known broken pane must appear in route');
  assert.ok(planMove(s,lead.id,goal),
   'planning should offer a legal direct portal rather than rejecting destination');
  toggling(s);
  let pending=false,airborne=false,finished=false;
  for(let tick=0;tick<1050;tick++){
   stepSession(s,1/60);
   pending ||=!!lead.traversalPending;
   airborne ||=lead.traversal?.kind==='climb-window';
   if(dist(lead.p,goal)<7&&lead.plan.length===0){
    finished=true;break;
   }
  }
  assert.ok(pending,'actor must approach a real window takeoff');
  assert.ok(airborne,'actor must use window climb, not ghost through the sill');
  assert.ok(finished,'actor must continue beyond portal and finish authored MOVE '+JSON.stringify({
   at:lead.p,nav:lead.nav,blocked:lead.lastBlocker,plan:lead.plan,
   pending:lead.traversalPending,traversal:lead.traversal
  }));
 }finally{activateSite(null);}
});
