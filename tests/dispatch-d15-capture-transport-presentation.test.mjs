import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {downedTransportPresentation}
 from '../src/breach-capture-transport-presentation.ts';
import {newSession,team,enemies,planCasualtyTransport,
 toggling,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

const pt=(x,y)=>({x,y});
const site=()=>({
 seed:52115,name:'D15.5F captive presentation',
 layout:'corridor',rooms:[{id:'floor',x:110,y:140,w:420,h:150,
 kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[pt(155,200)],
 spawn:[pt(140,200),pt(140,250),pt(120,230),pt(120,270)],
 entrance:pt(145,200),objective:pt(155,200),
 extract:pt(575,200),bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
const setup=()=>{
 const s=newSession(0,undefined,'full-view','small','capture',site());
 const carrier=team(s)[0],target=enemies(s)[0];
 for(const peer of team(s))if(peer!==carrier)peer.health=0;
 carrier.p=pt(140,200);carrier.priorP={...carrier.p};
 target.p=pt(155,200);target.priorP={...target.p};
 target.health=0;target.injuryStage=3;
 target.surrendered=false;target.carriedById=null;
 return {s,carrier,target};
};
test('D15.5F presentation requires reciprocal actual custody and injured subject',()=>{
 const subject={id:'guard',p:pt(-16,0),health:0,heading:1,
  carriedById:'rook',transportMode:'carry'};
 const carrier={id:'rook',p:pt(0,0),health:4,heading:0,carryingId:'guard'};
 assert.deepEqual(downedTransportPresentation(subject,[carrier]),{
  carrierId:'rook',mode:'carry',heading:Math.PI/2,lift:18,
  carrierPosition:carrier.p
 });
 assert.equal(downedTransportPresentation({...subject,health:2},[carrier]),null);
 assert.equal(downedTransportPresentation(subject,[{...carrier,health:0}]),null);
 assert.equal(downedTransportPresentation(subject,[{...carrier,carryingId:null}]),null);
 assert.equal(downedTransportPresentation({...subject,carriedById:null},[carrier]),null);
});
test('D15.5F drag faces the actual motor corridor and unknown historic mode stays low',()=>{
 const carrier={id:'rook',p:pt(0,14),health:4,heading:0,carryingId:'guard'};
 const subject={id:'guard',p:pt(0,0),health:0,heading:2,
  carriedById:'rook',transportMode:null};
 const presentation=downedTransportPresentation(subject,[carrier]);
 assert.equal(presentation?.mode,'drag');
 assert.equal(presentation?.lift,2);
 assert.ok(Math.abs(presentation?.heading-Math.PI/2)<1e-9);
});
test('D15.5F real GO carry mode survives film rewind and clears on historical seek',()=>{
 const {s,carrier,target}=setup();
 try{
  assert.equal(planCasualtyTransport(s,carrier.id,target.id,
   s.scenario.extract,'carry'),true);
  toggling(s);
  const before=snapshot(s);
  for(let i=0;i<240&&s.phase==='running'&&!carrier.carryingId;i++)
   stepSession(s,1/60);
  assert.equal(carrier.carryingId,target.id);
  assert.equal(target.transportMode,'carry');
  const during=snapshot(s);
  assert.equal(downedTransportPresentation(target,s.operators)?.lift,18);
  applyReplayFrame(s,before);
  assert.equal(target.carriedById,null);
  assert.equal(target.transportMode,null,'no future carry leaks into pre-pickup frame');
  applyReplayFrame(s,during);
  assert.equal(target.transportMode,'carry');
  assert.equal(downedTransportPresentation(target,s.operators)?.mode,'carry');
  const old={...during,actors:during.actors.map(a=>
    a.id===target.id?((({transportMode,...rest})=>rest)(a)):a)};
  applyReplayFrame(s,old);
  assert.equal(target.transportMode,null,'old films omit new field');
  assert.equal(downedTransportPresentation(target,s.operators)?.mode,'drag');
 }finally{activateSite(null);}
});
test('D15.5F both renderers consume the shared read-only transport interpretation',()=>{
 const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 const three=src('breach-3d.ts'),plan=src('breach-2d-actor-renderer.ts');
 assert.match(three,/downedTransportPresentation\(actor,s\.operators\)/);
 assert.match(three,/heading:transport\?\.heading\?\?drawActor\.heading/);
 assert.match(three,/if\(transport\)object\.root\.position\.y\+=transport\.lift/);
 assert.match(plan,/downedTransportPresentation\(a,state\.operators\)/);
 assert.match(plan,/transport\?\.mode==='carry'/);
 assert.match(plan,/if\(!transport\)/);
});
