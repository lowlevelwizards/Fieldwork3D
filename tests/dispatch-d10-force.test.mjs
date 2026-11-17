import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessDispatchForce,dispatchForceHistory,validDispatchForceHistory}
 from '../src/dispatch-force-review.ts';
import {attributableCivilianHarm} from '../src/breach-civilian-harm.ts';
import {assessOperation} from '../src/breach-operations.ts';
import {newSession,debrief} from '../src/breach-game.ts';
import {acceptContract,resolveOperation,readCampaign}
 from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';

const impact=(id,side,victim,severity='injured',shooter=side==='blue'?'rook':'red')=>({
 id,shotId:id,at:id/10,victimId:victim,actorId:shooter,sourceSide:side,
 before:severity==='injured'?2:1,after:severity==='injured'?1:0,
 severity,p:{x:12,y:15}
});
const contact=(id,action,actor,target,kind='interaction')=>({
 id,t:id/10,kind,actor,p:{x:10,y:10},text:'recorded physical contact',
 meta:{action,targetId:target,contributorId:actor}
});

test('D10.1 confirmed harm de-duplicates physical shots and preserves actual shooter',()=>{
 const harm=[
  impact(8,'blue','civ:a','injured','rook'),
  impact(8,'blue','civ:a','injured','rook'),
  impact(11,'red','civ:b','incapacitated','enemy-1'),
  impact(12,'blue','civ:a','incapacitated','moss'),
  impact(13,'red','civ:c','injured','enemy-2')
 ];
 const review=assessDispatchForce(harm,[]);
 assert.equal(review.version,1);
 assert.equal(review.status,'civilian-harm-documented');
 assert.equal(review.harm.length,4);
 assert.deepEqual(review.harm.map(x=>x.actorId),['rook','enemy-1','moss','enemy-2']);
 assert.deepEqual(review.harm.map(x=>x.shotId),[8,11,12,13]);
 assert.deepEqual([review.blueCivilianInjured,review.blueCivilianDown],[0,1]);
 assert.deepEqual([review.redCivilianInjured,review.redCivilianDown],[1,1]);
 assert.deepEqual({injured:review.blueCivilianInjured,down:review.blueCivilianDown},
  attributableCivilianHarm(harm));
 const enemyOnly=assessDispatchForce([harm[2]],[]);
 assert.equal(enemyOnly.status,'no-blue-harm-in-retained-evidence');
 assert.deepEqual([enemyOnly.blueCivilianInjured,enemyOnly.blueCivilianDown],[0,0]);
});

test('D10.2 challenge, refusal, and surrender are separately attributable facts',()=>{
 const events=[
  contact(1,'suspect-challenge','rook','red-1'),
  contact(2,'suspect-refusal','rook','red-1'),
  contact(3,'suspect-challenge','moss','red-2'),
  contact(4,'suspect-compliance','red-2','red-2','surrender'),
  contact(5,'suspect-surrender','red-3','red-3','surrender'),
  contact(5,'suspect-surrender','red-3','red-3','surrender')
 ];
 const review=assessDispatchForce([],events);
 assert.deepEqual([review.challenges,review.refusals,review.surrenders],[2,1,2]);
 assert.equal(review.contacts.length,5);
 assert.equal(review.contacts[0].officerId,'rook');
 assert.equal(review.contacts[0].subjectId,'red-1');
 assert.equal(review.contacts[3].officerId,'red-2');
 assert.equal(review.contacts[3].outcome,'surrendered');
 assert.match(review.limitations.join(' '),/legal/);
});

test('D10.3 debrief accountability does not add a second scoring penalty',()=>{
 const s=newSession();
 const original=debrief(s);
 s.civilianHarmEvents.push(impact(2,'blue','civ:x'));
 const result=debrief(s);
 assert.equal(result.forceReview.blueCivilianInjured,1);
 assert.equal(result.score-original.score,
  assessOperation({outcome:'failure',kind:s.missionType,elapsed:0,
   casualties:0,teamSize:4,shots:0,hits:0,objective:false,
   extracted:0,civilianPlayerInjured:1}).score-
  assessOperation({outcome:'failure',kind:s.missionType,elapsed:0,
   casualties:0,teamSize:4,shots:0,hits:0,objective:false,
   extracted:0}).score);
 assert.ok(result.scoreComponents.filter(c=>
  c.label==='ATTRIBUTABLE CIVILIAN HARM').length<=1);
});

test('D10.4 historical closeout is versioned, rejects forged records and stays idempotent',()=>{
 const c=newDispatchPilotCampaign(10021);
 const job=c.contracts[0],accepted=acceptContract(c,job.id);
 const review=assessDispatchForce([impact(1,'blue','civ:1')],[
  contact(2,'suspect-challenge','rook','red-1')]);
 const snapshot=dispatchForceHistory(review);
 assert.equal(validDispatchForceHistory(snapshot),true);
 for(const payload of [
  {...snapshot,version:2},
  {...snapshot,challenges:-1},
  {...snapshot,surrenders:2.5},
  {...snapshot,unknown:true}
 ])assert.equal(validDispatchForceHistory(payload),false);
 const report={id:'d10-one',contractId:job.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:61,participatingIds:[],
  casualties:[],objective:true,events:[],dispatchForce:snapshot};
 const settled=resolveOperation(accepted,report);
 assert.deepEqual(settled.history.at(-1).dispatchForce,snapshot);
 assert.deepEqual(readCampaign(JSON.stringify(settled)),settled);
 assert.deepEqual(resolveOperation(settled,report),settled);
 const tampered={...settled,history:settled.history.map(h=>({
  ...h,dispatchForce:{...snapshot,challenges:Infinity}}))};
 assert.equal(readCampaign(JSON.stringify(tampered)),null);
 const sandbox=newDispatchPilotCampaign(10022);
 const noD10={...sandbox,history:[]};
 assert.deepEqual(readCampaign(JSON.stringify(noD10)),noD10);
});

test('D10.5 metadata and UI come from real battle and harm events, not hidden dossier claims',()=>{
 const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const orders=source('breach-order-interactions.ts');
 const surrender=source('breach-suspect-compliance.ts');
 const ui=source('ui/breach-after-action-mission-details.ts');
 const flow=source('breach-campaign-flow.ts');
 assert.match(orders,/action:'suspect-challenge'/);
 assert.match(orders,/action:'suspect-refusal'/);
 assert.match(surrender,/action:source==='challenge'\?'suspect-compliance'/);
 assert.match(ui,/DISPATCH FORCE & CONTACT REVIEW/);
 assert.match(ui,/Evidence review, not a legal ruling/);
 assert.match(flow,/dispatchForce:dispatchForceHistory\(stats.forceReview\)/);
 assert.doesNotMatch(source('breach-operations.ts'),/dispatchForceHistory/);
});
