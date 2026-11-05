import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianTransportEligible,takeCivilianCustody,
 dropCivilianCustody,proposedCivilianTransportStep,
 reconcileCivilianTransportFrame}
 from '../src/breach-civilian-transport.ts';
const person=()=>createCivilian({id:'civ:r2:1',role:'rescue',
 persona:'steady',activity:'waiting',position:{x:20,y:0},
 heading:0,roomId:'r',appearanceSeed:8,isRescueTarget:true});
test('R2-A1 civilian custody is exclusive and only for incapacitated people',()=>{
 const c=person(),a={id:'a',health:4,carryingId:null},
 b={id:'b',health:4,carryingId:null};
 assert.equal(civilianTransportEligible(c,a),false);
 c.health=0;c.injuryStage=3;c.following='b';
 assert.equal(takeCivilianCustody(c,a),true);
 assert.equal(c.carriedById,'a');assert.equal(a.carryingId,c.id);
 assert.equal(c.following,null);
 assert.equal(takeCivilianCustody(c,b),false);
 assert.equal(dropCivilianCustody(c,b),false);
 assert.equal(dropCivilianCustody(c,a),true);
 assert.equal(c.carriedById,null);assert.equal(a.carryingId,null);
});
test('R2-A1 physical trailing moves no faster than bounded carrier displacement',()=>{
 const p=proposedCivilianTransportStep({x:20,y:0},{x:0,y:0},
  {x:1,y:0},0,'drag',()=>true,[]);
 assert.ok(p);
 assert.ok(Math.hypot(p.x-20,p.y)<=2.0001);
 assert.ok(p.x<20);
});
test('R2-A1 body refuses blocked geometry and occupied landing',()=>{
 const from={x:20,y:0},a={x:0,y:0},to={x:2,y:0};
 assert.equal(proposedCivilianTransportStep(from,a,to,0,'drag',
  ()=>false,[]),null);
 const candidate=proposedCivilianTransportStep(from,a,to,0,'drag',
  ()=>true,[]);
 assert.ok(candidate);
 assert.equal(proposedCivilianTransportStep(from,a,to,0,'drag',
  ()=>true,[candidate]),null);
});

test('R2-C3 stationary rescuer settles civilian body at bounded swept speed',()=>{
 const body={x:46,y:0},carrier={x:0,y:0};
 const next=proposedCivilianTransportStep(body,carrier,carrier,0,'carry',
  ()=>true,[],.6);
 assert.ok(next&&next.x<46&&46-next.x<=.60001);
 assert.equal(proposedCivilianTransportStep(body,carrier,carrier,0,'carry',
  ()=>false,[],.6),null);
 assert.deepEqual(proposedCivilianTransportStep(body,carrier,carrier,0,'carry',
  ()=>true,[],0),body);
});
test('R2-C3 incoming neutral yields to an attached civilian body',()=>{
 const proposals=[
  {id:'carrier',side:'blue',alive:true,from:{x:10,y:0},to:{x:11,y:0}},
  {id:'civil',side:'neutral',alive:true,carried:true,
    from:{x:0,y:0},to:{x:2,y:0}},
  {id:'visitor',side:'neutral',alive:true,
    from:{x:40,y:0},to:{x:8,y:0}}
 ];
 const decisions=proposals.map(p=>({id:p.id,point:{...p.to},blocked:null}));
 reconcileCivilianTransportFrame(proposals,decisions,
  [{carrierId:'carrier',bodyId:'civil'}]);
 assert.deepEqual(decisions[2].point,proposals[2].from);
 assert.equal(decisions[2].blocked,'actor');
 assert.deepEqual(decisions[1].point,proposals[1].to);
});
test('R2-C3 stationary obstruction rolls carrier and civilian back together',()=>{
 const proposals=[
  {id:'carrier',side:'blue',alive:true,
    from:{x:32,y:0},to:{x:20,y:0}},
  {id:'civil',side:'neutral',alive:true,carried:true,
    from:{x:30,y:0},to:{x:10,y:0}},
  {id:'blocker',side:'neutral',alive:true,
    from:{x:4,y:0},to:{x:4,y:0}}
 ];
 const decisions=proposals.map(p=>({id:p.id,point:{...p.to},blocked:null}));
 reconcileCivilianTransportFrame(proposals,decisions,
  [{carrierId:'carrier',bodyId:'civil'}]);
 assert.deepEqual(decisions[0].point,proposals[0].from);
 assert.deepEqual(decisions[1].point,proposals[1].from);
 assert.equal(decisions[0].blocked,'actor');
 assert.equal(decisions[1].blocked,'actor');
});
