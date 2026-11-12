/** C7 semantic parity: the world stays physical, the mission reads actual actors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {missionForSeed,OPERATION_KINDS} from '../src/breach-operations.ts';
import {combatantForce,resolveMissionKind,captureTargetIndex,
 resolvedMissionPopulation,auditMissionScenario}
 from '../src/breach-mission-semantics.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {captureMissionStart,siteForMissionRestart}
 from '../src/breach-mission-restart.ts';
const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('C7 mission selector is one deterministic five-operation authority',()=>{
 assert.deepEqual(OPERATION_KINDS,['clear','intel','rescue','hold','capture']);
 for(let seed=0;seed<30;seed++){
  assert.equal(missionForSeed(seed),OPERATION_KINDS[seed%5]);
  assert.equal(resolveMissionKind({seed}),missionForSeed(seed));
 }
 assert.equal(resolveMissionKind(undefined),'clear');
 assert.equal(resolveMissionKind(undefined,'hold'),'hold');
 assert.equal(resolveMissionKind({seed:9,encounter:{mission:'intel'}},undefined),
  'intel','recorded plan overrides seed when using a prebuilt world');
 assert.equal(resolveMissionKind({seed:9,encounter:{mission:'intel'}},'rescue'),
  'rescue','explicit contract overrides a recorded plan');
});

test('C7 force classification is allegiance, not a uniform or faction cosmetic',()=>{
 assert.equal(combatantForce('blue'),'friendly');
 assert.equal(combatantForce('red'),'hostile');
 const actors=[{id:'a',side:'red',wardrobe:{faction:'allied'}},
  {id:'b',side:'blue',wardrobe:{faction:'opposition'}}];
 assert.deepEqual(actors.map(a=>combatantForce(a.side)),['hostile','friendly']);
});

test('C7 actual population facts exclude dormant neutrals and preserve rescue truth',()=>{
 const session={
  operators:[{id:'blue',side:'blue'},{id:'red',side:'red'}],
  civilians:[{id:'c',rescueTarget:false},{id:'rescue',rescueTarget:true}],
  rescue:null,captureTarget:'red',
  site:{encounter:{actors:[
   {id:'one',weaponProfile:'prepared'},
   {id:'stale',weaponProfile:'security'}]}}
 };
 const truth=resolvedMissionPopulation(session);
 assert.equal(truth.hostileCount,1);
 assert.deepEqual(truth.armedProfileCount,
  {ordinary:1,security:0,prepared:0},
  'stale plan count cannot report imaginary equipment profiles');
 assert.equal(truth.activeCivilianCount,1);
 assert.equal(truth.rescueTargetPresent,true);
 assert.equal(truth.captureTargetPresent,true);
 session.captureTarget='missing';
 assert.equal(resolvedMissionPopulation(session).captureTargetPresent,false);
 session.site.encounter.actors.pop();
 assert.equal(resolvedMissionPopulation(session).armedProfileCount.prepared,1);
});

test('C7 seed-generated missions retain exact physical encounter contract',()=>{
 try{
  for(const seed of [2,3,4,9,17]){
   const site=generateSite(seed,'small');
   const original=structuredClone(site);
   assert.equal(site.encounter.mission,missionForSeed(seed));
   assert.deepEqual(auditMissionScenario(site),[],
    'seed '+seed+' must have consistent groups, sides and objectives');
   assert.deepEqual(site,original,'offline semantic audit is read-only');
   const s=newSession(0,seed,'floor-plan','small',undefined,site,
    {enableCivilians:true});
   assert.equal(s.missionType,site.encounter.mission);
   assert.equal(enemies(s).length,site.encounter.actors.length);
   assert.equal(s.civilians.filter(c=>!c.rescueTarget).length,
    site.encounter.neutrals.length);
   assert.deepEqual(compileMissionFacts(s).armedProfileCount,
    resolvedMissionPopulation(s).armedProfileCount);
  }
 }finally{activateSite(null);}
});

test('C7 explicit prebuilt override is advisory and does not reroll enemy spawns',()=>{
 try{
  const site=generateSite(12,'small');
  const before=structuredClone(site),originalMission=site.encounter.mission;
  assert.notEqual(originalMission,'intel');
  const s=newSession(0,12,'floor-plan','small','intel',site);
  assert.equal(s.missionType,'intel');
  assert.equal(s.site,site,'prebuilt site should be adopted without regeneration');
  assert.deepEqual(site,before);
  assert.equal(auditMissionScenario(site,{mission:'intel'}).some(x=>
   x.code==='mission-mismatch'&&x.severity==='error'),true);
  assert.deepEqual(auditMissionScenario(site,{mission:'intel',
   explicitOverride:true}).filter(x=>x.severity==='error'),[]);
  assert.ok(auditMissionScenario(site,{mission:'intel',
   explicitOverride:true}).some(x=>x.code==='mission-mismatch'&&
    x.severity==='advisory'));
 }finally{activateSite(null);}
});

test('C7 encounter-requested CAPTURE survives prebuilt assembly and restart',()=>{
 try{
  const site=generateSite(11,'small',undefined,{mission:'capture'});
  const s=newSession(1,11,'true-blind','small',undefined,site);
  assert.equal(s.missionType,'capture');
  const index=captureTargetIndex(site,'capture',enemies(s).length);
  assert.ok(index>=0);
  assert.equal(s.captureTarget,enemies(s)[index].id);
  assert.ok(site.encounter.actors[index].role==='target');
  const start=captureMissionStart(s,'small');
  const restart=newSession(start.variant,start.seed,start.intelMode,
   start.scale,start.missionType,siteForMissionRestart(start));
  assert.equal(restart.missionType,'capture');
  assert.equal(restart.captureTarget,s.captureTarget);
  assert.deepEqual(restart.site,site);
  assert.equal(captureTargetIndex(site,'clear',enemies(s).length),-1);
  assert.equal(captureTargetIndex(undefined,'capture',2),0,
   'legacy first-hostile capture fallback remains supported');
 }finally{activateSite(null);}
});

test('C7 semantic auditor catches broken assignments without touching geometry',()=>{
 try{
  const original=generateSite(9,'small',undefined,{mission:'capture'});
  assert.deepEqual(auditMissionScenario(original),[]);
  const broken=structuredClone(original),plan=broken.encounter;
  const actor=plan.actors[0];
  broken.enemies[0].x+=12;
  plan.actors.push({...actor,id:actor.id,groupId:'missing'});
  plan.neutrals=[{id:actor.id,roomId:'nonexistent',isRescueTarget:true},
   {id:actor.id,roomId:'nonexistent',isRescueTarget:true}];
  const copy=structuredClone(broken);
  const codes=new Set(auditMissionScenario(broken).map(x=>x.code));
  for(const expected of ['duplicate-actor','position-mismatch',
   'hostile-count','placed-count','missing-membership',
   'duplicate-neutral','unknown-civilian-room',
   'duplicate-rescue-target'])assert.ok(codes.has(expected),expected);
  assert.deepEqual(broken,copy);
  const noTarget=structuredClone(original);
  noTarget.encounter.actors.forEach(a=>{if(a.role==='target')a.role='sentry';});
  assert.ok(auditMissionScenario(noTarget).some(x=>x.code==='capture-target'));
 }finally{activateSite(null);}
});

test('C7 read-only boundary keeps world generation, replay and visibility owners intact',()=>{
 const semantics=source('breach-mission-semantics.ts');
 assert.doesNotMatch(semantics,/Math\.random\(|generateSite\(|WebGLRenderer|document\.|observe\(|stepSession\(/);
 assert.match(source('breach-session-factory.ts'),
  /missionType:resolveMissionKind\(site,missionOverride,encounterContext\.mission\)/);
 assert.match(source('briefing/mission-facts.ts'),/resolvedMissionPopulation\(s\)/);
 assert.match(source('worldgen/encounter-director.ts'),/missionForSeed\(site\.seed\)/);
});
