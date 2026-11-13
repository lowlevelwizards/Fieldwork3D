import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultQuickPlaySettings,resolveQuickPlaySettings,
 QUICK_PLAY_INCIDENTS} from '../src/quick-play-settings.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite} from '../src/breach-core.ts';

const cases=[
 {id:'warrant-service',mission:'capture',building:'house'},
 {id:'missing-person',mission:'rescue',building:'house'},
 {id:'evidence-seizure',mission:'intel',building:'office'}
];
test('B5: three named incidents are selectable with compatible real mission+building',()=>{
 assert.deepEqual(QUICK_PLAY_INCIDENTS,cases.map(x=>x.id));
 for(const c of cases){
  const recipe=resolveQuickPlaySettings({...defaultQuickPlaySettings(),
    incident:c.id,seed:117,buildings:[c.building],
    mission:c.mission,size:'small'},999);
  assert.equal(recipe.incidentId,c.id);
  assert.equal(recipe.mission,c.mission);
  assert.equal(recipe.archetype,c.building);
  assert.deepEqual(recipe,resolveQuickPlaySettings({
    ...defaultQuickPlaySettings(),incident:c.id,
    seed:117,buildings:[c.building],mission:c.mission,size:'small'},10));
 }
});

test('B5: incident selection never silently overrides an incompatible mission or site',()=>{
 const start=defaultQuickPlaySettings();
 assert.throws(()=>resolveQuickPlaySettings({...start,incident:'warrant-service',
  mission:'rescue'},22),/different mission/);
 assert.throws(()=>resolveQuickPlaySettings({...start,incident:'warrant-service',
  buildings:['warehouse']},22),/not possible/);
 const accepted=resolveQuickPlaySettings({...start,incident:'warrant-service',
  mission:'random',buildings:['house','warehouse'],seed:22},22);
 assert.equal(accepted.mission,'capture');
 assert.equal(accepted.archetype,'house');
 assert.equal(accepted.incidentId,'warrant-service');
 const legacy=resolveQuickPlaySettings({...start,incident:undefined},22);
 assert.equal(legacy.incidentId,undefined);
});

test('B5: Quick Play UI and worker send the chosen incident through the ONE site compiler',()=>{
 const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 const config=src('ui/quick-play-configurator.ts');
 const worker=src('quick-play-worker.ts');
 const recipe=src('quick-play-settings.ts');
 assert.match(config,/picker\('INCIDENT'/);
 for(const c of cases)assert.ok(config.includes(c.id));
 assert.match(config,/incidentBuildings/);
 assert.match(config,/start\.disabled=count===0\|\|!validSeed\|\|!incidentBuildings/);
 assert.match(recipe,/incidentId:incident\?\.id/);
 assert.match(worker,/incidentId:req\.incidentId/);
 assert.match(worker,/enableIncidentIntent:true,mission:req\.mission/);
 assert.doesNotMatch(worker,/newSession\(/);
});

test('B5: a chosen Quick Play incident reaches an actual resolved encounter',()=>{
 try{
  const config={...defaultQuickPlaySettings(),seed:12,incident:'missing-person',
    buildings:['house'],mission:'random',size:'small'};
  const recipe=resolveQuickPlaySettings(config,999);
  const site=generateSite(recipe.seed,recipe.scale,undefined,{
   mission:recipe.mission,enableIncidentIntent:true,incidentId:recipe.incidentId,
   civilianPolicy:recipe.civilians,presence:recipe.presence
  },{archetype:recipe.archetype});
  assert.equal(site.encounter?.incidentIntentId,recipe.incidentId);
  assert.equal(site.encounter?.mission,recipe.mission);
 }finally{activateSite(null);}
});
