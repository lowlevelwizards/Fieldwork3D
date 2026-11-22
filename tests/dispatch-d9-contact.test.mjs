import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {challengeSuspectDecision,commitSuspectSurrender,
 SUSPECT_CHALLENGE_RANGE,SUSPECT_CHALLENGE_COOLDOWN}
 from '../src/breach-suspect-compliance.ts';
import {newSession,team,enemies,planSuspectChallenge,planWatch,
 toggling,stepSession,debrief} from '../src/breach-game.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {activateSite} from '../src/breach-core.ts';
import {createInteractionOrderHandler} from '../src/breach-order-interactions.ts';

const base={door:false,node:false,flashRemaining:2,
 posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:30};

test('D9.1 challenge can win over a shaken suspect but still permits refusal',()=>{
 const s={health:3,surrendered:false,morale:.88,suppression:0,
  injuryStage:0};
 assert.equal(challengeSuspectDecision(s,8),'refuse');
 assert.equal(challengeSuspectDecision({...s,morale:.16,suppression:.28},8),
  'surrender');
 assert.equal(challengeSuspectDecision({...s,morale:.44,suppression:.76},8),
  'surrender');
 assert.equal(challengeSuspectDecision({...s,morale:.50,suppression:.9},8),
  'surrender');
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
 assert.doesNotMatch(interactions,/port.inSight\(a,suspect,s\)/);
 assert.match(interactions,/rotate\(a,Math.atan2\(suspect.p.y-a.p.y,/);
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

test('D15.8 challenge turns a known speaker before judging actual response',()=>{
 const pt=(x,y)=>({x,y});
 const site={seed:59127,name:'challenge turn',layout:'corridor',
  rooms:[{id:'floor',x:80,y:140,w:420,h:160,kind:'room',purpose:'floor',tone:1}],
  roomCount:1,walls:[],cover:[],doors:[],windows:[],
  enemies:[pt(315,200)],spawn:[pt(300,200),pt(300,230),
    pt(300,260),pt(300,290)],entrance:pt(290,200),
  objective:pt(120,200),extract:pt(470,200),
  bounds:{minX:0,minY:0,maxX:640,maxY:740}};
 const s=newSession(0,59127,'full-view','small','hold',site);
 try{
  const speaker=team(s)[0],suspect=enemies(s)[0],events=[];
  speaker.p=pt(300,200);speaker.priorP={...speaker.p};
  speaker.heading=Math.PI;speaker.velocity=0;
  suspect.p=pt(315,200);suspect.priorP={...suspect.p};
  suspect.morale=.3;suspect.suppression=0;
  const order={id:99127,kind:'interact',p:{...speaker.p},
    interaction:'challenge-suspect',objectId:'suspect:'+suspect.id};
  speaker.plan=[order];
  const interaction=createInteractionOrderHandler({
   notify:(_s,reason)=>events.push(String(reason)),
   battleEvent:(_s,kind,_actor,_at,message)=>events.push(kind+':'+message),
   hear:()=>{},approach:()=>true,
   inSight:()=>false,liveVisibility:()=>true,movePhysicalProp:()=>false
  });
  for(let i=0;i<180&&!suspect.surrendered;i++){
   s.seconds=i/60;
   interaction(s,speaker,order,1/60);
  }
  assert.equal(suspect.surrendered,true,
   'an explicit spoken command works even when speaker starts facing away');
  assert.ok(events.some(x=>x.includes('CHALLENGED')));
  assert.ok(events.some(x=>x.includes('SURRENDERED')));
 }finally{activateSite(null);}
});

test('D15.8 an explicit WATCH sector wins over passive surrendered-suspect staring',()=>{
 const pt=(x,y)=>({x,y});
 const site={seed:59128,name:'passive attention',layout:'corridor',
  rooms:[{id:'floor',x:80,y:140,w:420,h:160,kind:'room',purpose:'floor',tone:1}],
  roomCount:1,walls:[],cover:[],doors:[],windows:[],
  enemies:[pt(315,200)],spawn:[pt(300,200),pt(300,230),
    pt(300,260),pt(300,290)],entrance:pt(290,200),
  objective:pt(120,200),extract:pt(470,200),
  bounds:{minX:0,minY:0,maxX:640,maxY:740}};
 const s=newSession(0,59128,'full-view','small','hold',site);
 try{
  const a=team(s)[0],p=enemies(s)[0];
  for(const blue of team(s))if(blue!==a)blue.health=0;
  a.p=pt(300,200);a.priorP={...a.p};
  a.heading=0;a.weaponYaw=0;a.firePolicy='hold';
  p.p=pt(315,200);p.priorP={...p.p};
  p.surrendered=true;p.restrained=false;
  p.suspectEscapeCooldownUntil=100;
  a.awareness.visualProgress[p.id]=1;
  assert.equal(planWatch(s,a.id,pt(300,275),undefined,'here'),true);
  toggling(s);
  for(let i=0;i<110&&s.phase==='running';i++)stepSession(s,1/60);
  const delta=Math.atan2(Math.sin(a.heading-Math.PI/2),
    Math.cos(a.heading-Math.PI/2));
  assert.ok(Math.abs(delta)<.45,
   'operator honors authored WATCH away from compliant suspect');
 }finally{activateSite(null);}
});
