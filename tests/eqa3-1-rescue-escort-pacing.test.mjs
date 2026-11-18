import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {escortWalkMultiplier,rescueFollowGoal} from '../src/breach-civilian-mission.ts';
import {setCivilianState} from '../src/breach-civilian-types.ts';
import {newSession,planMove,team,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const point=(x,y)=>({x,y});
const owner={id:'rook',p:point(0,0)};
const civilian=(health=2,dist=55)=>({
 state:'escorted',following:'rook',health,
 injuryStage:health===1?1:0,p:point(dist,0)});
test('EQA3.1 healthy actual FOLLOW matches the civilian 43u/s pace as gap widens',()=>{
 assert.equal(escortWalkMultiplier(owner,null),1);
 assert.equal(escortWalkMultiplier(owner,civilian(2,20)),1);
 assert.equal(escortWalkMultiplier(owner,civilian(2,55)),.78);
 assert.equal(escortWalkMultiplier(owner,civilian(2,75)),.78*.8);
 assert.equal(escortWalkMultiplier(owner,civilian(2,100)),.78*.45);
 assert.ok(53*escortWalkMultiplier(owner,civilian(2,55))<43);
 assert.equal(escortWalkMultiplier(owner,civilian(2,112)),0,
  'ordinary walking waits before 125-unit FOLLOW break');
});
test('EQA3.1 injured civilian escort slows leader to the real 22u/s gait',()=>{
 assert.equal(escortWalkMultiplier(owner,civilian(1,55)),.39);
 assert.ok(53*escortWalkMultiplier(owner,civilian(1,55))<22);
 assert.ok(53*escortWalkMultiplier(owner,civilian(1,100))<14);
});
test('EQA3.1 escort tail tracks actual travelled path while operator WATCH faces sideways',()=>{
 const actual=rescueFollowGoal({
  p:point(100,200),priorP:point(100,199),velocity:43,heading:0
 });
 assert.ok(Math.abs(actual.x-100)<1e-6);
 assert.ok(Math.abs(actual.y-177)<1e-6,
  'northbound actor watching east leaves follower on real southward trail');
 assert.deepEqual(rescueFollowGoal({p:point(100,200),heading:0,
  priorP:point(100,200),velocity:0}),point(77,200),
  'idle fallback retains deterministic heading-based anchor');
 assert.deepEqual(rescueFollowGoal({p:point(100,200),heading:0}),
  point(77,200),'legacy caller remains compatible');
 const waiting=rescueFollowGoal({p:point(100,200),heading:0,
  priorP:point(100,200),velocity:0},{p:point(100,330)});
 assert.deepEqual(waiting,point(100,223),
  'a stopped LOOK/WATCH operator anchors the next contact toward their actual follower');
});
test('EQA3.1 no automatic slowing of an unassigned, incapacitated, carried or non-following person',()=>{
 const c=civilian();
 for(const changed of [
  {...c,following:'ash'},
  {...c,health:0},
  {...c,state:'compliant'},
  {...c,state:'frozen'}
 ])assert.equal(escortWalkMultiplier(owner,changed),1);
});
test('EQA3.1 only ordinary MOVE under real FOLLOW owns the speed cap, not author RUN or planned ENTRY',()=>{
 const source=readFileSync(new URL('../src/breach-order-movement.ts',import.meta.url),'utf8');
 assert.match(source,/const escorted=!running&&n.kind==='move'&&/);
 assert.match(source,/!n.entryDoorId&&!n.stackDoorId&&s.mission==='extract'&&/);
 assert.match(source,/s.rescue\?\.following===a.id/);
 assert.match(source,/const escortScale=escortWalkMultiplier\(a,escorted\)/);
});
const simpleSite=()=>({
 seed:313101,name:'EQA3.1 unobstructed real rescue-follow pacing',
 layout:'corridor',rooms:[{id:'sales',x:110,y:140,w:420,h:150,
  kind:'room',purpose:'sales',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[point(140,200),point(140,250),point(120,230),point(120,270)],
 entrance:point(145,200),objective:point(155,200),
 extract:point(575,200),bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('EQA3.1 real 60Hz motor keeps a walking operator and rescued civilian physically connected',()=>{
 const site=simpleSite();
 const s=newSession(0,undefined,'floor-plan','small','rescue',site,
  {enableCivilians:true});
 try{
  const leader=team(s)[0],person=s.civilians.find(c=>c.rescueTarget);
  assert.ok(person);
  person.p=point(125,200);person.priorP={...person.p};
  setCivilianState(person,'escorted',0);
  person.following=leader.id;
  s.rescue.following=leader.id;s.rescue.p={...person.p};
  s.mission='extract';
  assert.equal(planMove(s,leader.id,point(475,200)),true);
  toggling(s);
  let greatest=0;
  for(let i=0;i<270&&s.phase==='running';i++){
   stepSession(s,1/60);
   const dist=Math.hypot(leader.p.x-person.p.x,leader.p.y-person.p.y);
   greatest=Math.max(greatest,dist);
  }
  assert.equal(person.following,leader.id,
   'actual move should not cause accidental escort separation in open space');
  assert.equal(s.rescue.following,leader.id);
  assert.ok(leader.p.x>210,'actual operator should make physical progress');
  assert.ok(person.p.x>150,'civilian must really follow in the same world');
  assert.ok(greatest<120,'body separation stays below the 125 break threshold');
 }finally{activateSite(null);}
});
