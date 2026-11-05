import test from 'node:test';
import assert from 'node:assert/strict';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {newSession,team,planCivilianInteraction,toggling,
 stepSession} from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
const base={door:false,node:false,flashRemaining:2,
 posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:30};
test('E5-C4 civilian menu actions appear only when physically eligible',()=>{
 const empty=contextActionChoices(base);
 assert.equal(empty.some(c=>c.id==='ctxSecureCivilian'),false);
 const options=contextActionChoices({...base,nearCivilian:true,
  escortableCivilian:true});
 assert.ok(options.some(c=>c.id==='ctxSecureCivilian'));
 assert.ok(options.some(c=>c.id==='ctxFollowCivilian'));
});
test('E5-C4 SECURE queues real interaction instead of remote state change',()=>{
 const s=newSession(),op=team(s)[0],civil=createCivilian({
  id:'civ:secure:1',role:'visitor',persona:'steady',
  activity:'idle',position:{x:op.p.x+14,y:op.p.y},
  heading:0,roomId:'r',appearanceSeed:6});
 s.civilians.push(civil);op.heading=0;
 assert.equal(planCivilianInteraction(s,op.id,civil.id,'secure'),true);
 assert.equal(civil.state,'routine','planning does not execute command');
 toggling(s);
 stepSession(s,1/60);
 assert.equal(civil.state,'compliant');
});
test('E5-C4 no unseen or distant civilian can receive authored order',()=>{
 const s=newSession(),op=team(s)[0],civil=createCivilian({
  id:'civ:far:1',role:'visitor',persona:'steady',
  activity:'idle',position:{x:op.p.x+400,y:op.p.y},
  heading:0,roomId:'r',appearanceSeed:7});
 s.civilians.push(civil);
 assert.equal(planCivilianInteraction(s,op.id,civil.id,'secure'),false);
 assert.equal(planCivilianInteraction(s,op.id,civil.id,'follow'),false);
});
