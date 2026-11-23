import test from 'node:test';
import assert from 'node:assert/strict';
import {CIVILIAN_VOICE_RANGE,nearestContextCivilian}
 from '../src/breach-civilian-context-selection.ts';
import {civilianPresentationVisible,escortedCivilianVisible}
 from '../src/breach-civilian-visibility.ts';
import {presentCivilian}
 from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {captureReplayKnowledge}
 from '../src/breach-replay-visibility.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {newSession,team,toggling,stepSession,planCivilianInteraction}
 from '../src/breach-game.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';

const from={x:0,y:0};
const target=(x,following=null)=>({
  id:'civ:voice',p:{x,y:0},health:2,state:following?'escorted':'compliant',
  rescueTarget:true,following
});
test('VOICE: follow is much farther than physical contact, but never through an obstruction',()=>{
 assert.equal(CIVILIAN_VOICE_RANGE,150);
 const c=target(75);
 assert.equal(nearestContextCivilian([c],from,'follow','extract',
   ()=>true,()=>true),c);
 assert.equal(nearestContextCivilian([c],from,'follow','extract',
   ()=>false,()=>true),null,'a previously unknown person cannot be shouted into disclosure');
 assert.equal(nearestContextCivilian([c],from,'follow','extract',
   ()=>true,()=>false),null,'closed wall/door blocks voice contact');
 assert.equal(nearestContextCivilian([target(166)],from,'follow','extract',
   ()=>true,()=>true),null);
 assert.equal(nearestContextCivilian([c],from,'secure','extract',
   ()=>true,()=>true),null,'SECURE remains physical contact');
 assert.equal(nearestContextCivilian([c],from,'restrain','extract',
   ()=>true,()=>true),null,'RESTRAIN remains physical contact');
});
test('STOP: known followers can be told to hold within voice range; strangers cannot',()=>{
 const following=target(78,'rook'),unassigned=target(12);
 assert.equal(nearestContextCivilian([unassigned,following],from,
   'stop-following','extract',()=>false,()=>true),following,
   'an existing escort remains known even without present visual sight');
 assert.equal(nearestContextCivilian([following],from,
   'stop-following','secure',()=>true,()=>true),null);
 assert.equal(nearestContextCivilian([following],from,
   'stop-following','extract',()=>true,()=>false),null);
 assert.equal(nearestContextCivilian([unassigned],from,
   'stop-following','extract',()=>true,()=>true),null);
 const basic={door:false,node:false,flashRemaining:2,
   posture:'stand',pace:'walk',firePolicy:'engage',reserve:20,magazine:20};
 const actions=contextActionChoices({...basic,stopFollowingCivilian:true});
 assert.equal(actions.find(a=>a.id==='ctxStopFollowingCivilian')?.label,
   'STAY HERE');
 assert.equal(contextActionChoices(basic).some(a=>
   a.id==='ctxStopFollowingCivilian'),false);
});
test('ESCORT: active custody remains visible live and in the historically restored frame only',()=>{
 const c=target(70,'rook');
 assert.equal(escortedCivilianVisible(c),true);
 assert.equal(civilianPresentationVisible(c,false,false,false),true);
 assert.equal(civilianPresentationVisible({...c,replayVisible:false},
   true,false,false),true,'recorded follower is known even outside replay sight');
 const stopped={...c,following:null,state:'compliant',replayVisible:false};
 assert.equal(escortedCivilianVisible(stopped),false);
 assert.equal(civilianPresentationVisible(stopped,false,false,false),false);
 assert.equal(civilianPresentationVisible(stopped,true,false,true),false,
   'STOP must not leak a future live sightline into the prior film');
 const down={...c,health:0,following:null,state:'incapacitated'};
 assert.equal(escortedCivilianVisible(down),false);
});
test('MISSION: FOLLOW then STOP are actual reversible GO orders, never planning-time changes',()=>{
 const s=newSession(),a=team(s)[0];
 a.heading=0;a.weaponYaw=0;
 const c=createCivilian({id:'civ:voice:rescue',role:'rescue',
   persona:'steady',activity:'waiting',
   position:{x:a.p.x+14,y:a.p.y},heading:0,
   roomId:'r',appearanceSeed:7,isRescueTarget:true});
 s.civilians.push(c);
 s.missionType='rescue';s.mission='extract';
 s.rescue={p:{...c.p},following:null,trail:[]};
 s.scenario.extract={x:3000,y:3000};
 assert.equal(planCivilianInteraction(s,a.id,c.id,'follow'),true);
 assert.equal(c.following,null);
 toggling(s);stepSession(s,1/60);
 assert.equal(c.following,a.id);
 assert.equal(c.state,'escorted');
 assert.equal(presentCivilian(s,c,false,null),true);
 assert.equal(presentCivilian(s,c,false,
   {mode:'operator',observerId:a.id}),true);
 assert.ok(captureReplayKnowledge(s).visibleCivilianIds.includes(c.id));
 toggling(s);
 const stop=dispatchTacticalContextCommand({state:s,selected:a.id,actor:a,
   node:undefined,door:undefined,selectedActiveWatch:false,
   action:'ctxStopFollowingCivilian',medicalCandidate:()=>null});
 assert.equal(stop.outcome,'accepted');
 assert.equal(a.plan.at(-1)?.interaction,'stop-following-civilian');
 assert.equal(c.following,a.id,'STOP cannot mutate custody in planning');
 toggling(s);stepSession(s,1/60);
 assert.equal(c.following,null);
 assert.equal(s.rescue.following,null);
 assert.equal(c.state,'compliant');
 assert.equal(c.goal,null);
 assert.deepEqual(c.nav,[]);
 toggling(s);
 assert.equal(planCivilianInteraction(s,a.id,c.id,'stop-following'),false);
 assert.equal(planCivilianInteraction(s,a.id,c.id,'follow'),true,
   'a stopped person can be asked to follow again');
 toggling(s);stepSession(s,1/60);
 assert.equal(c.following,a.id);
});
