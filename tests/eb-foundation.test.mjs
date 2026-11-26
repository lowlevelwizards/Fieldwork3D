import test from 'node:test';import assert from 'node:assert/strict';
import {AI_GROUP_KINDS,AI_GROUP_PROFILES,AI_COMPETENCE} from '../src/breach-ai-group-profiles.ts';
import {npcIdentity,npcGroupKind} from '../src/breach-ai-identity.ts';
import {doctrineForGroup} from '../src/breach-ai-doctrine.ts';
test('EB1 catalog exhaustively defines all identities and valid competence distributions',()=>{
 assert.equal(AI_GROUP_KINDS.length,7);assert.equal(AI_COMPETENCE.length,4);
 for(const kind of AI_GROUP_KINDS){
  const p=AI_GROUP_PROFILES[kind];assert.ok(p.label&&p.motivation);
  const [a,b,c]=p.competenceCutoffs;assert.ok(0<=a&&a<=b&&b<=c&&c<=1);
  assert.equal(doctrineForGroup(kind),p.doctrine);
  const identity=npcIdentity(41,'actor','occupants','occupant','routine',kind);
  assert.deepEqual(identity,npcIdentity(41,'actor','occupants','occupant','routine',kind));
  assert.equal(identity.groupKind,kind);assert.equal(identity.motivation,p.motivation);
  for(const tier of AI_COMPETENCE)assert.equal(npcIdentity(41,'actor',undefined,undefined,undefined,kind,tier).competence,tier);
  assert.equal(npcIdentity(41,'actor','occupants','target','routine',kind).motivation,'avoid-capture');
 }
 assert.equal(npcGroupKind('organised','defensive'),'armed-irregulars');
 assert.equal(doctrineForGroup('regular-force'),'organised');
});

import {npcPressurePolicy} from '../src/breach-ai-pressure-policy.ts';
import {attemptNpcWithdrawal} from '../src/breach-ai-task-state.ts';
import {newSession,enemies} from '../src/breach-game.ts';
test('EB2 shared withdrawal owner prevents duplicate shelter work and retains existing retries',()=>{
 const a=enemies(newSession())[0];let calls=0;
 const shelter=()=>{calls++;return null;};
 assert.equal(attemptNpcWithdrawal(a,1,shelter,11,true),'unavailable');
 assert.equal(a.alert,'cover');assert.equal(attemptNpcWithdrawal(a,1.2,shelter),'deferred');assert.equal(calls,1);
 assert.equal(attemptNpcWithdrawal(a,3,()=>({x:a.p.x+30,y:a.p.y}),11,true),'committed');
 assert.equal(a.alert,'retreat');assert.equal(attemptNpcWithdrawal(a,4,shelter),'deferred');
 assert.equal(calls,1);
 assert.ok(npcPressurePolicy('cautious').contactWithdraw<npcPressurePolicy('aggressor').contactWithdraw);
});

import {aiSiteIndex,connectedAreaCenters} from '../src/breach-ai-site-index.ts';
test('EB3 cache ignores leaf motion but catches in-place threshold edits and new geometry',()=>{
 const site={rooms:[{id:'a',kind:'room',x:0,y:0,w:100,h:100},{id:'b',kind:'room',x:100,y:0,w:100,h:100}]};
 const world={site,cover:[],revision:0};
 const doors=[{id:'a-b',a:{x:100,y:30},b:{x:100,y:70},open:false}];
 const first=aiSiteIndex(world,doors);
 assert.deepEqual(connectedAreaCenters(first,{x:50,y:50}),[{x:150,y:50}]);
 doors[0].open=true;assert.equal(aiSiteIndex(world,doors),first);
 doors[0].a.y=35;const changed=aiSiteIndex(world,doors);assert.notEqual(changed,first);
 world.revision++;assert.notEqual(aiSiteIndex(world,doors),changed);
});

import {AiWorkScheduler} from '../src/breach-ai-work-scheduler.ts';
test('EB4 a scheduled actor cannot chain elective jobs on the same tick, urgent work bypasses',()=>{
 const ids=Array.from({length:32},(_,i)=>'eb'+i),work=new AiWorkScheduler(2,ids),seen=new Set();
 for(let tick=0;tick<32;tick++){
  let admitted=0;
  for(const id of ids)if(work.allow(id,'investigation-route',tick)){
   seen.add(id);admitted++;
   assert.equal(work.allow(id,'idle-route',tick),false);
   assert.equal(work.allow(id,'emergency',tick,true),true);
  }
  assert.ok(admitted<=2);
 }
 assert.equal(seen.size,32);assert.ok(work.maxUnitsObserved<=work.maxUnitsPerTick);
});

import {attachGroupProfiles,selectEncounterGroupProfile} from '../src/worldgen/encounter-group-identity.ts';
import {generateSite} from '../src/breach-site.ts';
test('EB5 context-aware group resolution is deterministic and does not mutate physical memberships',()=>{
 const group={id:'group-0',purpose:'occupants',members:['a']};
 const actors=[{id:'a',role:'target'}];
 assert.equal(selectEncounterGroupProfile(group,actors,'hideout',7,{mission:'capture'},'fugitive-lead'),'fugitives');
 assert.equal(selectEncounterGroupProfile({...group,purpose:'organised'},actors,'hideout',7,{mission:'capture'},'fugitive-lead'),'organised-criminals');
 const military=new Set(),civilian=new Set();
 for(let seed=0;seed<128;seed++){
  military.add(selectEncounterGroupProfile({...group,purpose:'organised'},[],'defensive',seed,{forceContext:'military'}));
  civilian.add(selectEncounterGroupProfile({...group,purpose:'organised'},[],'defensive',seed,{}));
 }
 assert.deepEqual([...civilian],['armed-irregulars']);
 for(const kind of ['specialists','regular-force','armed-irregulars'])assert.ok(military.has(kind),kind);
 const attached=attachGroupProfiles([group],actors,'hideout',7,{groupProfile:'security'});
 assert.equal(attached[0].behaviorProfile,'security');assert.deepEqual(attached[0].members,group.members);
 assert.equal(group.behaviorProfile,undefined);
});
test('EB5 live generated encounter stores identities and explicit profile reaches actual actors',()=>{
 const site=generateSite(17,'small',undefined,{mission:'capture',groupProfile:'regular-force'});
 assert.ok(site.encounter.groups.length);
 assert.ok(site.encounter.groups.every(g=>g.behaviorProfile==='regular-force'));
 const s=newSession(0,17,'floor-plan','small','capture',site);
 assert.ok(enemies(s).length);assert.ok(enemies(s).every(a=>a.npcIdentity?.groupKind==='regular-force'));
});

import {encounterReactionDelay} from '../src/breach-encounter-readiness.ts';
import {investigationTempo} from '../src/breach-ai-investigation.ts';
import {coordinationLeaseSeconds} from '../src/breach-ai-team-commitment.ts';
test('EB6 experience separates assessment and task persistence without modifying physical stats',()=>{
 const tiers=AI_COMPETENCE.map(t=>npcIdentity(5,'eb','organised','occupant','defensive','armed-irregulars',t));
 const timings=tiers.map(t=>encounterReactionDelay('attentive','same',100,t.competence));
 assert.ok(timings.every((v,i)=>i===0||v<timings[i-1]));
 const sameTraits=tiers.map(t=>({...t,composure:.5,patience:.5,discipline:.5,loyalty:.5}));
 const tempos=sameTraits.map(t=>investigationTempo('guard',65,t));
 assert.ok(tempos[0].orientSeconds>tempos[3].orientSeconds);
 assert.ok(tempos[0].inspectSeconds<tempos[3].inspectSeconds);
 assert.ok(coordinationLeaseSeconds('watch',40,'organised',sameTraits[0])<
  coordinationLeaseSeconds('watch',40,'organised',sameTraits[3]));
 assert.equal(encounterReactionDelay('attentive','same',100),
  encounterReactionDelay('attentive','same',100,undefined));
});

import {moraleResponse} from '../src/breach-ai-morale.ts';
import {captureTargetMayWithdraw,missionObjectiveResponse} from '../src/breach-ai-mission-response.ts';
test('EB7 motivations alter resolve and assigned duties, never fabricate contact',()=>{
 assert.equal(moraleResponse(.57,.5,0,'guard',{motivation:'survive'}),'withdraw');
 assert.equal(moraleResponse(.57,.5,0,'guard',{motivation:'protect-assignment'}),'hold');
 const facts={mission:'rescue',role:'sentry',distanceToPost:60,distanceOfEvidenceToPost:90,
  heardActionableEvidence:true,directSight:false,suppression:0};
 assert.equal(missionObjectiveResponse(facts),'observe-approach');
 assert.equal(missionObjectiveResponse({...facts,motivation:'protect-assignment'}),'hold-post');
 assert.equal(missionObjectiveResponse({...facts,motivation:'protect-assignment',heardActionableEvidence:false}),'investigate');
 const evade={mission:'clear',role:'occupant',confirmedSight:false,heardAlarm:false,
  hasEstimate:true,isAlreadyWithdrawing:false,secondsSinceAttempt:10,motivation:'avoid-capture'};
 assert.equal(captureTargetMayWithdraw(evade),false);
 assert.equal(captureTargetMayWithdraw({...evade,heardAlarm:true}),true);
 assert.equal(captureTargetMayWithdraw({...evade,heardAlarm:true,hasEstimate:false}),false);
});

import {ambientStationary,contextualRoutineDwell,routineDwellSeconds} from '../src/breach-ai-routine-dwell.ts';
test('EB8 ambient pauses reflect actual activity; stationary duties do not invent patrols',()=>{
 assert.ok(ambientStationary('watching','sentry'));assert.ok(ambientStationary('inspecting','occupant'));
 assert.equal(ambientStationary('patrolling','patrol'),false);
 assert.ok(contextualRoutineDwell('a','inspecting',1,2)>routineDwellSeconds('a','inspecting',1,2));
 assert.equal(contextualRoutineDwell('a','patrolling',1,2),contextualRoutineDwell('a','patrolling',1,2));
});

import {canRecordInspection} from '../src/breach-ai-search-memory.ts';
test('EB9 failed routes never count as inspected; dwell and physical arrival are required',()=>{
 assert.equal(canRecordInspection(true,0,12,11),false);
 assert.equal(canRecordInspection(false,40,12,11),false);
 assert.equal(canRecordInspection(false,0,12,13),false);
 assert.equal(canRecordInspection(false,0,12,0),false);
 assert.equal(canRecordInspection(false,15,12,11),true);
});

import {defensiveTravelState} from '../src/breach-ai-position-commitment.ts';
test('EB10 cover travel is physically bounded, arrival wins over expiration',()=>{
 assert.equal(defensiveTravelState(8,5,12,11),'arrived');
 assert.equal(defensiveTravelState(40,2.7,12,16),'expired');
 assert.equal(defensiveTravelState(40,0,16,16),'expired');
 assert.equal(defensiveTravelState(40,0,12,16),'travel');
});

import {groupResponse} from '../src/breach-ai-coordination.ts';
test('EB11 loose groups share warnings without formal support; commitments remain stable',()=>{
 const listeners=['a','b','c'].map((id,i)=>({id,p:{x:i*30,y:0}}));
 const loose=groupResponse(listeners,{x:0,y:0},{},'opportunists');
 const organized=groupResponse(listeners,{x:0,y:0},{},'regular-force');
 assert.deepEqual(Object.values(loose),['investigate','watch','watch']);
 assert.deepEqual(Object.values(organized),['investigate','watch','support']);
 assert.equal(groupResponse(listeners,{x:0,y:0},{c:'investigate'},'security').c,'investigate');
});

import {challengeCompliance,fallenAlliesByGroup} from '../src/breach-ai-morale.ts';
import {challengeSuspectDecision} from '../src/breach-suspect-compliance.ts';
test('EB12 challenge and morale use the same motivation offset; custody gates remain authoritative',()=>{
 assert.equal(challengeCompliance(.37,0,0,'survive'),true);
 assert.equal(challengeCompliance(.37,0,0,'protect-assignment'),false);
 const target={health:3,surrendered:false,morale:.37,suppression:0,injuryStage:0,
 encounterGroupId:'g',npcIdentity:{motivation:'survive'},lastChallengeAt:0};
 assert.equal(challengeSuspectDecision(target,3),'cooldown');
 assert.equal(challengeSuspectDecision(target,10),'surrender');
 assert.equal(challengeSuspectDecision({...target,surrendered:true},10),'ineligible');
});
test('EB12 fallen ally index preserves actual membership and ordering',()=>{
 const actor=(id,encounterGroupId,health,side='red',surrendered=false)=>({id,encounterGroupId,health,side,surrendered,p:{x:0,y:0}});
 const a=actor('a','g',0),b=actor('b','h',0),c=actor('c','g',0);
 const grouped=fallenAlliesByGroup([a,b,actor('live','g',2),actor('blue','g',0,'blue'),actor('captive','g',0,'red',true),c]);
 assert.deepEqual(grouped.get('g'),[a,c]);assert.deepEqual(grouped.get('h'),[b]);
});

import {enemyKitForEncounter} from '../src/breach-enemy-loadouts.ts';
import {resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {ENEMY_OUTFIT_PROFILES} from '../src/breach-enemy-outfit-profiles.ts';
test('EB13 generated group kit is deterministic, actual and independent of role',()=>{
 for(const kind of AI_GROUP_KINDS){
  const group={kind,id:'group-1'};
  for(let i=0;i<10;i++){
   const a=enemyKitForEncounter({role:'occupant'},31,i,group);
   const b=enemyKitForEncounter({role:'leader'},31,i,group);
   assert.deepEqual(a.equipment,b.equipment);assert.deepEqual(a.wardrobe,b.wardrobe);
   assert.ok(ENEMY_OUTFIT_PROFILES[kind].weapons.includes(a.preset.id));
   assert.equal(a.equipment.slots.primary,'primary-'+a.weapon);
   assert.ok(a.weaponConfiguration.build);
   assert.equal(a.equipment.slots.tactical,'tactical-none');
   assert.equal(a.equipment.slots.utility,'utility-none');
   assert.ok(resolvedWardrobe(a.wardrobe,a.equipment).top);
  }
 }
});

import {wardrobeItem,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
test('EB14 civilian wardrobe selections survive save and actual loadout resolution',()=>{
 let kit=initialEquipmentLoadout(),wardrobe=initialWardrobe();
 for(const [slot,id] of [['top','hoodie'],['trousers','jeans'],['footwear','sneakers']]){
  assert.ok(wardrobeItem(slot,id));
  const next=selectWardrobeItem(kit,wardrobe,slot,id);kit=next.kit;wardrobe=next.wardrobe;
  assert.equal(resolvedWardrobe(readWardrobe(JSON.parse(JSON.stringify(wardrobe))),kit)[slot],id);
 }
 assert.equal(kit.slots.top,'top-light');assert.equal(kit.slots.legs,'legs-light');assert.equal(kit.slots.feet,'feet-light');
});

test('EB15 uniform groups share palette and issue; civilian silhouettes remain distinct',()=>{
 for(const kind of ['security','regular-force','specialists']){
  const group={kind,id:'unit'};
  const a=enemyKitForEncounter(undefined,97,0,group);
  const b=enemyKitForEncounter(undefined,97,1,group);
  assert.equal(a.preset.id,b.preset.id);
  assert.deepEqual(a.wardrobe.fabricSolids,b.wardrobe.fabricSolids);
  assert.deepEqual(a.wardrobe.fabricCamo,b.wardrobe.fabricCamo);
  assert.equal(a.wardrobe.styles.top,b.wardrobe.styles.top);
 }
 const group={kind:'opportunists',id:'loose'};
 for(let i=0;i<10;i++){
  const a=enemyKitForEncounter(undefined,97,i,group);
  const look=resolvedWardrobe(a.wardrobe,a.equipment);
  assert.ok(['jeans','civilian-cargo','track-pants'].includes(look.trousers));
  assert.equal(look.footwear,'sneakers');assert.equal(a.equipment.slots.armor,'armor-none');
 }
});

import {hostileWarningCue,liveAudioCuesForEvent} from '../src/breach-audio-event-cues.ts';
import {ReplaySoundTimeline} from '../src/breach-replay-audio.ts';
import {hostilePhysicalityAt} from '../src/breach-hostile-physicality.ts';
test('EB16 actual warning events produce spatial live and replay cues; aim and custody retain priority',()=>{
 const message='GUARD WARNED NEARBY DEFENDERS';
 assert.equal(hostileWarningCue(message),'people.enemy_callout');
 assert.ok(liveAudioCuesForEvent(message).some(c=>c.id==='people.enemy_callout'));
 assert.equal(hostileWarningCue('GUARD LOOKING'),undefined);
 const track=new ReplaySoundTimeline([], [{id:'w',t:1,kind:'intel',text:message,p:{x:4,y:5},actor:'guard'}]);
 assert.equal(track.events[0].kind,'warning');assert.equal(track.between(0,2).length,1);
 const a={side:'red',health:3,surrendered:false,alert:'idle',aim:0,reload:0,
 velocity:0,suppression:0,lastNoiseAt:-100,lastReportAt:1,p:{x:0,y:0},heading:0,heard:null,contact:null};
 assert.ok(hostilePhysicalityAt(a,1.425).headPitch>.12);
 assert.equal(hostilePhysicalityAt({...a,aim:1},1.425).headPitch,0);
 assert.equal(hostilePhysicalityAt({...a,surrendered:true},1.425).headPitch,0);
});
