import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,planMove,team,enemies,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const pt=(x,y)=>({x,y});
const site=()=>({
 seed:51311,name:'D15.5 actual captive-follow motor acceptance',layout:'corridor',
 rooms:[{id:'floor',x:110,y:140,w:420,h:150,
  kind:'room',purpose:'floor',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],
 enemies:[pt(125,200)],
 spawn:[pt(140,200),pt(140,250),pt(120,230),pt(120,270)],
 entrance:pt(145,200),objective:pt(125,200),extract:pt(575,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('D15.5 real 60Hz TeamActor motor keeps a physically restrained captive with the squad',()=>{
 const s=newSession(0,undefined,'floor-plan','small','capture',site());
 try{
  const leader=team(s)[0],prisoner=enemies(s)[0];
  assert.ok(leader&&prisoner);
  for(const blue of team(s))if(blue!==leader)blue.health=0;
  leader.p=pt(140,200);leader.priorP={...leader.p};
  leader.heading=0;leader.weaponYaw=0;
  prisoner.p=pt(125,200);prisoner.priorP={...prisoner.p};
  prisoner.heading=0;prisoner.weaponYaw=0;
  prisoner.health=3;prisoner.injuryStage=0;
  prisoner.surrendered=true;prisoner.restrained=true;
  prisoner.escortLeaderId=leader.id;prisoner.lastEscortRouteAt=-100;
  prisoner.escortGoal=null;prisoner.nav=[];
  s.mission='extract';s.captureSecured=true;
  assert.equal(planMove(s,leader.id,pt(475,200)),true);
  toggling(s);
  let maxGap=0;
  for(let i=0;i<300&&s.phase==='running';i++){
   stepSession(s,1/60);
   const gap=Math.hypot(leader.p.x-prisoner.p.x,
    leader.p.y-prisoner.p.y);
   maxGap=Math.max(maxGap,gap);
  }
  assert.equal(prisoner.escortLeaderId,leader.id,
   'real movement must not falsely terminate escort in an open passage');
  assert.ok(leader.p.x>210,'squad leader physically advances');
  assert.ok(prisoner.p.x>150,'living prisoner genuinely moves under custody');
  assert.ok(maxGap<125,'real separation remains within controlled custody');
  assert.equal(prisoner.health,3,'escort is not simulated by incapacitation');
 }finally{activateSite(null);}
});
