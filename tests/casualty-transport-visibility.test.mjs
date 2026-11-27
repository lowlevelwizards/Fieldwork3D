import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,liveVisibility,liveBodyVisible,observerBodyVisible,CASUALTY_CLOSE_AWARENESS_RADIUS} from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {presentActor,presentCivilian} from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {captureReplayKnowledge} from '../src/breach-replay-visibility.ts';
import {friendlyTransportVisible} from '../src/breach-transport-custody.ts';
import {activateSite} from '../src/breach-core.ts';
function setup(){
 const pt=(x,y)=>({x,y});
 const site={seed:52116,name:'visibility lab',layout:'corridor',rooms:[{id:'floor',x:100,y:100,w:400,h:300,kind:'room',purpose:'floor',tone:1}],roomCount:1,walls:[],cover:[],doors:[],windows:[],enemies:[pt(180,200)],spawn:[pt(200,200),pt(140,250),pt(120,230),pt(120,270)],entrance:pt(145,200),objective:pt(155,200),extract:pt(575,200),bounds:{minX:0,minY:0,maxX:640,maxY:740}};
 const s=newSession(0,undefined,'full-view','small','capture',site);
 s.intel.mode='true-blind';
 const carrier=s.operators.find(a=>a.side==='blue'),body=s.operators.find(a=>a.side==='red');
 for(const a of s.operators)if(a!==carrier)a.health=0;
 carrier.p=pt(200,200);carrier.heading=0;body.p=pt(160,200);body.health=0;
 const civil=createCivilian({id:'civ:visibility',role:'resident',persona:'steady',activity:'idle',position:pt(160,200),heading:0,roomId:'floor',appearanceSeed:6});
 civil.health=0;civil.state='incapacitated';s.civilians=[civil];
 return {s,carrier,body,civil,pt};
}
test('friendly reciprocal transport stays disclosed in both shared render paths and replay evidence',()=>{
 const {s,carrier,body,civil}=setup();
 try{
  for(const target of [body,civil])for(const mode of ['drag','carry']){
   carrier.carryingId=target.id;target.carriedById=carrier.id;target.transportMode=mode;
   assert.equal(liveVisibility(s,target.p),false);
   assert.equal(friendlyTransportVisible(target,s.operators),true);
   const present=target===body?presentActor:presentCivilian;
   assert.equal(present(s,target,false,null),true);
   const record=captureReplayKnowledge(s);
   assert.ok((target===body?record.visibleActorIds:record.visibleCivilianIds).includes(target.id));
   assert.ok((target===body?record.operatorVisibleBodyIds:record.operatorVisibleCivilianIds)[carrier.id].includes(target.id));
   carrier.carryingId=null;
   assert.equal(present(s,target,false,null),false,'stale link must not reveal a patient');
   target.carriedById=null;target.transportMode=null;
  }
 }finally{activateSite(null);}
});
test('body remains visible while standing on or just past it, not after leaving local awareness',()=>{
 const {s,carrier,body,civil,pt}=setup();
 try{
  for(const distance of [0,2,12,CASUALTY_CLOSE_AWARENESS_RADIUS]){
   body.p=pt(carrier.p.x-distance,carrier.p.y);civil.p={...body.p};
   assert.equal(observerBodyVisible(s,carrier,body.p),true);
   assert.equal(presentActor(s,body,false,null),true);
   assert.equal(presentCivilian(s,civil,false,null),true);
  }
  body.p=pt(carrier.p.x-CASUALTY_CLOSE_AWARENESS_RADIUS-1,carrier.p.y);civil.p={...body.p};
  assert.equal(liveBodyVisible(s,body.p),false);
  assert.equal(presentActor(s,body,false,null),false);
  assert.equal(presentCivilian(s,civil,false,null),false);
  civil.health=2;civil.state='routine';civil.p=pt(carrier.p.x-5,carrier.p.y);
  assert.equal(presentCivilian(s,civil,false,null),false,'living civilian still requires ordinary sight');
  body.health=3;body.p={...civil.p};assert.equal(presentActor(s,body,false,null),false,'living hostile still requires detection');
 }finally{activateSite(null);}
});
