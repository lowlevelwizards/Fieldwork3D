import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,toggling,stepSession,observerPointVisible}
 from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';

const p=(x,y)=>({x,y});
const site=()=>({
 seed:31515,name:'EQA3.15 moving physical rescue target',
 layout:'corridor',
 rooms:[{id:'hall',x:80,y:140,w:440,h:200,
  kind:'room',purpose:'hall',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[p(300,200),p(280,250),p(280,300),p(290,320)],
 entrance:p(315,200),objective:p(245,200),extract:p(480,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
function session(){
 const s=newSession(0,31515,'floor-plan','small','rescue',site(),
   {enableCivilians:true});
 const actor=team(s)[0],civil=s.civilians.find(c=>c.rescueTarget);
 assert.ok(civil);
 for(const other of team(s))if(other!==actor)other.health=0;
 actor.p=p(300,200);actor.priorP={...actor.p};
 actor.heading=Math.PI;actor.weaponYaw=Math.PI;
 actor.plan=[];actor.nav=[];
 return {s,actor,civil};
}
function tick(s,n=38){
 for(let i=0;i<n&&s.phase==='running';i++)stepSession(s,1/60);
}
test('EQA3.15 discovery follows the real rescue person, never an empty original marker',()=>{
 const {s,actor,civil}=session();
 try{
  // Explicitly isolate this moving-contact test from briefing discovery
  // that may have happened while the initial four operators were alive.
  s.objectiveIntel.discovered=false;
  const original={...s.scenario.objective};
  civil.p=p(355,200);civil.priorP={...civil.p};
  assert.equal(observerPointVisible(s,actor,original),true);
  assert.equal(observerPointVisible(s,actor,civil.p),false,
   'actual subject is behind the only living squad observer');
  toggling(s);tick(s);
  assert.equal(s.objectiveIntel.discovered,false,
   'observing an empty original site is not objective discovery');
  assert.deepEqual(s.scenario.objective,original);
  assert.deepEqual(s.rescue.p,civil.p,'mission physics always keeps real subject location');
  actor.heading=0;actor.weaponYaw=0;
  assert.equal(observerPointVisible(s,actor,civil.p),true);
  tick(s);
  assert.equal(s.objectiveIntel.discovered,true);
  assert.deepEqual(s.scenario.objective,civil.p,
   'now-disclosed mission marker follows only real geometric observation');
  const seen=snapshot(s);
  // Civilian crosses behind the squad and leaves the last known location.
  civil.p=p(240,200);civil.priorP={...civil.p};
  assert.equal(observerPointVisible(s,actor,civil.p),false);
  tick(s);
  assert.deepEqual(s.scenario.objective,seen.objective,
   'lost contact cannot grant a wall/behind-operator tracking signal');
  const lost=snapshot(s);
  assert.deepEqual(lost.objective,seen.objective,
   'replay captures last known marker, not hidden current position');
  assert.deepEqual(lost.rescue.p,civil.p,
   'the physical rescue person continues existing even while not observed');
  civil.p=p(400,200);civil.priorP={...civil.p};
  tick(s);
  assert.deepEqual(s.scenario.objective,civil.p,
   'a reacquired moving subject updates the objective marker again');
  const foundAgain=snapshot(s);
  applyReplayFrame(s,lost);
  assert.deepEqual(s.scenario.objective,lost.objective,
   'replay rewind restores historical marker without future knowledge');
  applyReplayFrame(s,foundAgain);
  assert.deepEqual(s.scenario.objective,foundAgain.objective);
 }finally{activateSite(null);}
});
