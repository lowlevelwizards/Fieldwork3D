import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies,team,planSecureDroppedFirearm,
 planSearchSuspect,toggling,stepSession} from '../src/breach-game.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {activateSite} from '../src/breach-core.ts';
test('D15.4 contextual SEARCH and SECURE exist only for actual eligible targets',()=>{
 const o={door:false,node:false,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:0,magazine:10,flashRemaining:0,
  nearSearchableSuspect:true,nearDroppedFirearm:true};
 const ids=contextActionChoices(o).map(x=>x.id);
 assert.ok(ids.includes('ctxSearchSuspect'));
 assert.ok(ids.includes('ctxSecureFirearm'));
 assert.equal(contextActionChoices({...o,nearDroppedFirearm:false})
   .some(x=>x.id==='ctxSecureFirearm'),false);
 assert.equal(contextActionChoices({...o,nearSearchableSuspect:false})
   .some(x=>x.id==='ctxSearchSuspect'),false);
});
test('D15.4 world firearm is a replayed physical item, not an actor pose',()=>{
 const s=newSession(0,4);
 try{
  const actor=enemies(s)[0];
  assert.equal(commitSuspectSurrender(s,actor,()=>{},()=>{}),true);
  const gun=s.droppedFirearms[0];
  assert.ok(gun?.id);
  assert.equal(gun.status,'loose');
  const first=snapshot(s);
  gun.status='secured';gun.securedById='rook';
  const second=snapshot(s);
  applyReplayFrame(s,first);
  assert.equal(s.droppedFirearms[0].status,'loose');
  applyReplayFrame(s,second);
  assert.equal(s.droppedFirearms[0].status,'secured');
  assert.equal(s.droppedFirearms[0].securedById,'rook');
 }finally{activateSite(null);}
});
test('D15.4 no remote weapon securing or unsecured suspect search',()=>{
 const s=newSession(0,4);
 try{
  const a=team(s)[0],suspect=enemies(s)[0];
  assert.equal(commitSuspectSurrender(s,suspect,()=>{},()=>{}),true);
  assert.equal(planSearchSuspect(s,a.id,suspect.id),false,
    'surrender is not restraint');
  assert.equal(planSecureDroppedFirearm(s,a.id,s.droppedFirearms[0].id),
    false,'inaccessible dropped gun cannot be secured remotely');
 }finally{activateSite(null);}
});

test('D15.8 a surrendered suspect does not physically pin their dropped weapon',()=>{
 const pt=(x,y)=>({x,y});
 const site={seed:51885,name:'D15 dropped weapon physical contact',layout:'corridor',
  rooms:[{id:'floor',x:80,y:140,w:420,h:160,kind:'room',purpose:'floor',tone:1}],
  roomCount:1,walls:[],cover:[],doors:[],windows:[],
  enemies:[pt(315,200)],spawn:[pt(300,200),pt(300,230),
    pt(300,260),pt(300,290)],
  entrance:pt(290,200),objective:pt(100,200),extract:pt(475,200),
  bounds:{minX:0,minY:0,maxX:640,maxY:740}};
 const s=newSession(0,51885,'full-view','small','hold',site);
 try{
  const a=team(s)[0],suspect=enemies(s)[0];
  for(const other of team(s))if(other!==a)other.health=0;
  a.p=pt(300,200);a.priorP={...a.p};
  suspect.p=pt(315,200);suspect.priorP={...suspect.p};
  suspect.heading=0;
  assert.equal(commitSuspectSurrender(s,suspect,()=>{},()=>{}),true);
  const gun=s.droppedFirearms[0];
  assert.ok(gun);
  assert.ok(Math.hypot(gun.p.x-suspect.p.x,gun.p.y-suspect.p.y)>=19,
   'the weapon is no longer directly under the suspect collision body');
  a.heading=Math.atan2(gun.p.y-a.p.y,gun.p.x-a.p.x);
  a.weaponYaw=a.heading;
  assert.equal(planSecureDroppedFirearm(s,a.id,gun.id),true,
   'secure is available from a nearby clear hand-reach position');
  toggling(s);
  for(let i=0;i<150&&s.phase==='running'&&gun.status==='loose';i++)
   stepSession(s,1/60);
  assert.equal(gun.status,'secured','operator secures the actual dropped object');
  assert.equal(gun.securedById,a.id);
 }finally{activateSite(null);}
});
