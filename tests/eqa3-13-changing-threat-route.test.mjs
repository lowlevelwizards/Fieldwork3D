import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianResponse} from '../src/breach-civilian-response.ts';
import {civilianEscapeCrossesDanger}
 from '../src/breach-civilian-refuge.ts';

const pt=(x,y)=>({x,y});
const make=()=>{
 const c=createCivilian({
  id:'civ:eqa313:route',role:'employee',persona:'steady',
  activity:'idle',position:pt(70,70),heading:0,
  roomId:'hall',appearanceSeed:13
 });
 c.state='fleeing';c.stateSince=1;c.fear=.82;
 c.lastEvidenceAt=1;c.lastRefugeRecheckAt=1;
 c.goal=pt(210,70);c.nav=[pt(120,70),pt(210,70)];
 c.refugePoints=[pt(70,140)];
 return c;
};
const hostile={
 id:'RED',side:'red',p:pt(105,70),heading:Math.PI,
 health:4,velocity:0,posture:'stand',aim:0,lastShotAt:2.95
};
const sensory=(visible=true)=>({
 noise:[],people:[hostile],doors:[],walls:[],windows:[],
 canSee:()=>visible,canReach:()=>true,routeTo:()=>[]
});
test('EQA3.13 new witnessed danger invalidates a crossing flee path even when endpoint is safe',()=>{
 const c=make();
 c.threatEstimate=pt(105,70);
 assert.ok(Math.hypot(c.goal.x-105,c.goal.y-70)>
   Math.hypot(c.p.x-105,c.p.y-70)+15,
   'endpoint safety alone would incorrectly retain this route');
 assert.equal(civilianEscapeCrossesDanger(c),true);
 c.threatEstimate=null;
 c.visualProgress.RED=1; // Prior physically confirmed acquisition, not clairvoyance
 stepCivilianResponse(c,3,.2,sensory());
 assert.equal(c.lastVisualId,'RED/alarm');
 assert.deepEqual(c.threatEstimate,hostile.p);
 assert.deepEqual(c.goal,pt(70,140));
 assert.equal(c.state,'fleeing');
 assert.deepEqual(c.p,pt(70,70),'reaction alone never teleports the body');
 const lastRecheck=c.lastRefugeRecheckAt;
 stepCivilianResponse(c,3.16,.16,sensory());
 assert.equal(c.lastRefugeRecheckAt,lastRecheck,
  'ongoing alarm must honor bounded refuge recheck cadence');
});
test('EQA3.13 occluded shot never redirects a civilian through unseen danger',()=>{
 const c=make(),oldGoal={...c.goal};
 c.visualProgress.RED=1;
 stepCivilianResponse(c,3,.2,sensory(false));
 assert.equal(c.lastVisualId,null);
 assert.equal(c.lastFlinchAt,-100);
 assert.equal(c.threatEstimate,null);
 assert.deepEqual(c.goal,oldGoal);
});
test('EQA3.13 path audit checks waypoint legs, but does not constrain quiet historical decisions',()=>{
 const c=make();
 c.threatEstimate=pt(105,70);
 assert.equal(civilianEscapeCrossesDanger(c),true);
 c.nav=[pt(70,140),pt(210,140)];
 assert.equal(civilianEscapeCrossesDanger(c),false);
 c.nav=[];
 c.goal=pt(210,70);
 c.fear=.1;
 assert.equal(civilianEscapeCrossesDanger(c),false);
 c.fear=.85;c.goal=null;
 assert.equal(civilianEscapeCrossesDanger(c),false);
});
