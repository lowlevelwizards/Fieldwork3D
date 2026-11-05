import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,toggling,stepSession,addNode}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
function person(p){
 const c=createCivilian({id:'civ:r2:rescue',role:'rescue',persona:'steady',
  activity:'waiting',position:p,heading:0,roomId:'r',
  appearanceSeed:39,isRescueTarget:true});
 c.health=0;c.injuryStage=3;c.state='incapacitated';return c;
}
function scenario(){
 const s=newSession(),op=team(s)[0];
 op.heading=0;op.weaponYaw=0;
 const c=person({x:op.p.x+14,y:op.p.y});
 s.civilians.push(c);s.missionType='rescue';s.mission='secure';
 s.rescue={p:{...c.p},following:null,trail:[]};
 s.scenario.objective={...c.p};
 s.scenario.extract={x:3000,y:3000};
 return {s,op,c};
}
test('R2-A2 incapacitation does not immediately fail an otherwise recoverable rescue',()=>{
 const {s}=scenario();toggling(s);stepSession(s,1/60);
 assert.equal(s.phase,'running');assert.equal(s.mission,'secure');
});
test('R2-A2 timed pickup owns the true civilian and advances rescue',()=>{
 const {s,op,c}=scenario();
 assert.equal(addNode(s,op.id,'evacuate',
  {x:op.p.x+60,y:op.p.y},{patientId:c.id,transportMode:'drag'}),true);
 toggling(s);
 for(let i=0;i<70;i++)stepSession(s,1/60);
 assert.equal(op.carryingId,c.id);
 assert.equal(c.carriedById,op.id);
 assert.equal(c.following,null);
 assert.equal(s.mission,'extract');
});
test('R2-A2 context palette only exposes transport on civilian casualty',()=>{
 const base={door:false,node:false,flashRemaining:2,
 posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:30};
 assert.equal(contextActionChoices(base).some(x=>x.id==='ctxCarryCivilian'),false);
 const actions=contextActionChoices({...base,nearCivilianCasualty:true});
 assert.ok(actions.some(x=>x.id==='ctxCarryCivilian'));
 assert.ok(actions.some(x=>x.id==='ctxDragCivilian'));
});
