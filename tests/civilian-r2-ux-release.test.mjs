import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,addNode,planCivilianRelease,toggling,stepSession}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {takeCivilianCustody} from '../src/breach-civilian-transport.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
test('R2-C2 explicit RELEASE is undoable and drops custody without re-pickup',()=>{
 const s=newSession(),a=team(s)[0];
 const c=createCivilian({id:'civ:r2:release',role:'rescue',
 persona:'steady',activity:'waiting',position:{x:a.p.x+12,y:a.p.y},
 heading:0,roomId:'r',appearanceSeed:14,isRescueTarget:true});
 c.health=0;c.injuryStage=3;c.state='incapacitated';
 s.civilians.push(c);s.missionType='rescue';s.mission='extract';
 s.rescue={p:{...c.p},following:null,trail:[]};
 assert.equal(takeCivilianCustody(c,a,'drag'),true);
 assert.equal(addNode(s,a.id,'evacuate',{x:a.p.x+50,y:a.p.y},
  {patientId:c.id,transportMode:'drag'}),true);
 assert.equal(planCivilianRelease(s,a.id),true);
 assert.equal(a.plan[0].interaction,'release-civilian');
 assert.equal(a.plan.some(n=>n.kind==='evacuate'&&n.patientId===c.id),false);
 toggling(s);stepSession(s,1/60);
 assert.equal(c.carriedById,null);
 assert.equal(a.carryingId,null);
 assert.equal(c.transportMode,null);
});
test('R2-C2 release is not offered without real current transport',()=>{
 const base={door:false,node:false,flashRemaining:2,
 posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:30};
 assert.equal(contextActionChoices(base)
  .some(a=>a.id==='ctxReleaseCivilian'),false);
 const c=contextActionChoices({...base,carryingCivilian:true});
 assert.equal(c.some(a=>a.id==='ctxReleaseCivilian'),true);
});
