import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {challengeSuspectDecision,commitSuspectSurrender,
 SUSPECT_CHALLENGE_RANGE,SUSPECT_CHALLENGE_COOLDOWN}
 from '../src/breach-suspect-compliance.ts';
import {newSession,team,enemies,planSuspectChallenge,
 toggling,stepSession,debrief} from '../src/breach-game.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {activateSite} from '../src/breach-core.ts';

const base={door:false,node:false,flashRemaining:2,
 posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:30};

test('D9.1 spoken challenge needs low morale AND observed threat pressure',()=>{
 const s={health:3,surrendered:false,morale:.88,suppression:0,
  injuryStage:0};
 assert.equal(challengeSuspectDecision(s,8),'refuse');
 assert.equal(challengeSuspectDecision({...s,morale:.16,suppression:.28},8),
  'surrender');
 assert.equal(challengeSuspectDecision({...s,morale:.44,suppression:.76},8),
  'surrender');
 assert.equal(challengeSuspectDecision({...s,morale:.50,suppression:.9},8),
  'refuse');
 assert.equal(challengeSuspectDecision({...s,lastChallengeAt:8},9),
  'cooldown');
 assert.equal(challengeSuspectDecision({...s,lastChallengeAt:8},
  8+SUSPECT_CHALLENGE_COOLDOWN),'refuse');
 assert.equal(challengeSuspectDecision({...s,health:0},8),'ineligible');
});

test('D15.2 living surrender preserves health and releases the held firearm',()=>{
 const s=newSession(0,4),suspect=enemies(s)[0];
 try{
  const emitted=[];
  const done=commitSuspectSurrender(s,suspect,(_s,msg)=>emitted.push(msg),
   (_s,kind,actor,point,msg)=>emitted.push({kind,actor,point,msg}),
   'challenge');
  assert.equal(done,true);
  assert.ok(suspect.health>0);
  assert.equal(suspect.surrendered,true);
  assert.equal(suspect.injuryStage,0);
  assert.equal(suspect.releasedWeaponId,s.droppedFirearms[0]?.id);
  assert.equal(s.droppedFirearms[0]?.ownerId,suspect.id);
  assert.equal(suspect.plan.length,0);
  assert.equal(commitSuspectSurrender(s,suspect,()=>{},()=>{}),false);
  assert.ok(emitted.some(x=>x.kind==='surrender'));
 }finally{activateSite(null);}
});

test('D9.2 palette makes CHALLENGE contextual, never a door or civilian command',()=>{
 assert.equal(contextActionChoices(base).some(a=>a.id==='ctxChallengeSuspect'),false);
 const eligible=contextActionChoices({...base,nearSuspect:true});
 assert.ok(eligible.some(a=>a.id==='ctxChallengeSuspect'));
 assert.equal(contextActionChoices({...base,door:true,
  nearSuspect:true}).some(a=>a.id==='ctxChallengeSuspect'),false);
});

test('D9.2 planning cannot interact remotely or with unseen hostile',()=>{
 const s=newSession(0,4),op=team(s)[0],suspect=enemies(s)[0];
 try{
  assert.ok(suspect);
  // No favorable full-view knowledge can bypass personal recognition.
  suspect.p={x:op.p.x+SUSPECT_CHALLENGE_RANGE+35,y:op.p.y};
  assert.equal(planSuspectChallenge(s,op.id,suspect.id),false);
  suspect.p={x:op.p.x+20,y:op.p.y};
  op.heading=Math.PI;op.weaponYaw=Math.PI;
  op.awareness.visualProgress[suspect.id]=0;
  assert.equal(planSuspectChallenge(s,op.id,suspect.id),false);
 }finally{activateSite(null);}
});

test('D9.2 order processing is timed and source-limited; no new authority for arbitrary nearby civilians',()=>{
 const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const interactions=read('breach-order-interactions.ts');
 assert.match(interactions,/n.interaction==='challenge-suspect'/);
 assert.match(interactions,/port.inSight\(a,suspect,s\)/);
 assert.match(interactions,/SUSPECT_CHALLENGE_SECONDS/);
 assert.match(interactions,/commitSuspectSurrender\(s,suspect,notify,battleEvent,'challenge',a\.id\)/);
 assert.match(read('breach-tactical-context-command.ts'),/planSuspectChallenge\(state,selected,target.id\)/);
 assert.match(read('ui/tactical-palette-controller.ts'),/nearSuspect:!!suspectAtPlan/);
 assert.match(read('breach-order-interactions.ts'),/n.interaction==='follow-civilian'/);
});

test('D9.3 surrender scoring remains authoritative in existing debrief',()=>{
 const s=newSession(0,4),target=enemies(s).find(e=>e.id===s.captureTarget);
 try{
  assert.ok(target);
  const untouched=debrief(s);
  assert.equal(typeof untouched.grade,'string');
  const recorded=[];
  assert.equal(commitSuspectSurrender(s,target,()=>{},
    (_s,kind)=>recorded.push(kind),'challenge'),true);
  assert.equal(target.surrendered,true);
  assert.ok(recorded.includes('surrender'));
  // Mission still needs physical approach and extraction; CHALLENGE alone
  // does not mark the capture objective or complete the mission.
  assert.equal(s.captureSecured,false);
  assert.equal(s.mission,'clear');
 }finally{activateSite(null);}
});
