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
