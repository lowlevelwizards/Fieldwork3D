import test from 'node:test';
import assert from 'node:assert/strict';
import {canOfferKnownRescueLook}
 from '../src/breach-rescue-contact-look.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';
import {setObjectiveIntelLevel} from '../src/breach-objective-intel.ts';
import {newSession,team,toggling,stepSession,liveVisibility}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const base={
 door:false,node:false,flashRemaining:2,posture:'stand',
 pace:'walk',firePolicy:'engage',reserve:30,magazine:30
};
const p=(x,y)=>({x,y});
test('EQA3.9 a known rescue point offers only a LOOK until physical observation',()=>{
 const at=p(100,100),point=p(85,100);
 const state={missionType:'rescue',mission:'secure',
  scenario:{objective:point},
  objectiveIntel:{level:'unknown',discovered:false}};
 assert.equal(canOfferKnownRescueLook(state,at,false,true),false,
  'unknown objective must never disclose its coordinates');
 state.objectiveIntel={level:'approximate',discovered:false};
 assert.equal(canOfferKnownRescueLook(state,at,false,true),false,
  'area clue cannot become an exact target');
 state.objectiveIntel={level:'approximate',discovered:true};
 assert.equal(canOfferKnownRescueLook(state,at,false,true),true,
  'physically discovered target may be looked at');
 state.objectiveIntel={level:'confirmed',discovered:false};
 assert.equal(canOfferKnownRescueLook(state,at,false,true),true,
  'confirmed briefing may support deliberate LOOK');
 assert.equal(canOfferKnownRescueLook(state,at,true,true),false,
  'already visible person does not need reacquisition button');
 assert.equal(canOfferKnownRescueLook(state,at,false,false),false,
  'opaque physical wall is never an invitation to CONTACT');
 assert.equal(canOfferKnownRescueLook(state,p(200,100),false,true),false);
 state.mission='extract';
 assert.equal(canOfferKnownRescueLook(state,at,false,true),false);
 state.mission='secure';state.missionType='intel';
 assert.equal(canOfferKnownRescueLook(state,at,false,true),false);
});
test('EQA3.9 palette offers contextual LOOK, never premature SECURE',()=>{
 const options=contextActionChoices({...base,knownRescueLook:true});
 assert.ok(options.some(c=>c.id==='ctxKnownRescueLook'));
 assert.equal(options.some(c=>c.id==='ctxSecureCivilian'),false);
 assert.equal(options.some(c=>c.id==='ctxFollowCivilian'),false);
 assert.equal(contextActionChoices(base).some(c=>
  c.id==='ctxKnownRescueLook'),false);
 assert.equal(contextActionChoices({...base,door:true,knownRescueLook:true})
   .some(c=>c.id==='ctxKnownRescueLook'),false,
   'door palette never leaks a hidden rescue action');
});
const site=()=>({
 seed:9939,name:'EQA3.9 unobstructed rescue person gaze',
 layout:'corridor',rooms:[{id:'floor',x:80,y:140,w:420,h:160,
 kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[p(300,200),p(300,230),p(300,260),p(300,290)],
 entrance:p(290,200),objective:p(285,200),extract:p(475,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('EQA3.9 physical GO authoring turns toward disclosed civilian but does not secure automatically',()=>{
 const s=newSession(0,9939,'floor-plan','small','rescue',site(),
  {enableCivilians:true});
 try{
  const rook=team(s)[0];
  for(const unit of team(s))if(unit!==rook)unit.health=0;
  const person=s.civilians.find(c=>c.rescueTarget);
  assert.ok(person);
  rook.p=p(300,200);rook.priorP=p(300,200);
  rook.heading=0;rook.weaponYaw=0;
  person.p=p(285,200);person.priorP={...person.p};
  s.scenario.objective={...person.p};
  s.mission='secure';
  setObjectiveIntelLevel(s,'confirmed');
  assert.equal(liveVisibility(s,person.p),false,
    'person must begin BEHIND the only live operator');
  const invoke=()=>dispatchTacticalContextCommand({
   state:s,actor:rook,selected:rook.id,node:undefined,door:undefined,
   selectedActiveWatch:false,action:'ctxKnownRescueLook',
   medicalCandidate:()=>null
  });
  assert.equal(invoke().outcome,'accepted');
  assert.equal(rook.plan.at(-1)?.kind,'look');
  assert.equal(person.state,'routine',
    'planning LOOK cannot teleport into SECURE or FOLLOW');
  toggling(s);
  for(let i=0;i<90&&s.phase==='running';i++)
   stepSession(s,1/60);
  assert.equal(liveVisibility(s,person.p),true,
    'real 60Hz GO should rotate toward the previously disclosed contact');
  assert.equal(person.state,'routine','GO-time sight is not compliance');
  assert.equal(s.mission,'secure','LOOK does not auto-complete rescue');
 }finally{activateSite(null);}
});
test('EQA3.9 unknown objective never permits contextual remote LOOK',()=>{
 const s=newSession(0,9939,'floor-plan','small','rescue',site(),
  {enableCivilians:true});
 try{
  const actor=team(s)[0];s.mission='secure';
  setObjectiveIntelLevel(s,'unknown');
  const outcome=dispatchTacticalContextCommand({
    state:s,actor,selected:actor.id,node:undefined,door:undefined,
    selectedActiveWatch:false,action:'ctxKnownRescueLook',
    medicalCandidate:()=>null
  });
  assert.equal(outcome.outcome,'rejected');
  assert.equal(actor.plan.length,0);
 }finally{activateSite(null);}
});
