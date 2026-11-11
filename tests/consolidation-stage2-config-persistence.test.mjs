import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBreachBootConfig,BREACH_LIGHTING_MODES,BREACH_SITE_SCALES}
 from '../src/breach-boot-config.ts';
import {BREACH_STORAGE_KEYS} from '../src/breach-storage-keys.ts';
import {
 readStoredText,writeStoredText,removeStoredText,loadIntelPreference,
 saveIntelPreference,loadQuickPlayRoster,saveQuickPlayRoster,
 loadCampaignFromStorage,saveCampaignToStorage,loadOperationHistory,
 appendOperationHistory
} from '../src/breach-persistence.ts';
import {initialRoster,serializeQuickPlayCosmetics} from '../src/breach-roster.ts';
import {newCampaign} from '../src/campaign-state.ts';
import {HISTORY_LIMIT} from '../src/breach-operations.ts';
import {MINIATURE_FOCUS_STORAGE_KEY,initialMiniatureFocusMode}
 from '../src/rendering/miniature-focus-config.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function store(seed={}){
 const map=new Map(Object.entries(seed));
 const removed=[];
 return {
  map,removed,
  getItem:key=>map.get(key)??null,
  setItem:(key,value)=>{map.set(key,value);},
  removeItem:key=>{removed.push(key);map.delete(key);}
 };
}

test('A2: default boot values reproduce the existing tactical entry',()=>{
 const x=parseBreachBootConfig('');
 assert.equal(x.briefingPreviewEnabled,true);
 assert.equal(x.civilianPreview,true);
 assert.equal(x.legacyStudy,false);
 assert.equal(x.quickEntry,false);
 assert.equal(x.requestedSeed,null);
 assert.equal(x.requestedCondition,null);
 assert.equal(x.lighting,'day');
 assert.equal(x.scale,'standard');
 assert.equal(x.replayDirectorDiagnostics,false);
 assert.equal(x.navDiagnostics,false);
 assert.equal(x.auditRouteMode,false);
 assert.equal(x.fogDebugPalette,false);
 assert.equal(x.bodycamQa,false);
 assert.equal(x.perfOverlay,false);
 assert.equal(x.awareness,null);
 assert.equal(x.gpuWarmupEnabled,true);
 assert.equal(x.focusFx,null);
 assert.ok(Object.isFrozen(x),'startup query must not become live mission state');
 assert.deepEqual(BREACH_LIGHTING_MODES,['day','evening','night','blackout','emergency']);
 assert.deepEqual(BREACH_SITE_SCALES,['standard','expanded','small','medium','large']);
});

test('A2: URL switches preserve presence, disabled and specialist QA semantics',()=>{
 const x=parseBreachBootConfig('?briefingV2=0&civilians=0&fixedSite&quick=0'+
  '&directorDebug&nav&audit&perf=0&bodycamqa&fogDebug=palette'+
  '&awareness=&gpuWarmup=0&focusFx=strong&lighting=night&scale=expanded'+
  '&seed=4294967295&condition=137');
 assert.equal(x.briefingPreviewEnabled,false);
 assert.equal(x.civilianPreview,false);
 assert.equal(x.legacyStudy,true);
 assert.equal(x.quickEntry,true,'quick=0 still has the legacy presence semantics');
 assert.equal(x.requestedSeed,0xffffffff);
 assert.equal(x.requestedCondition,100);
 assert.equal(x.lighting,'night');
 assert.equal(x.scale,'expanded');
 for(const flag of ['replayDirectorDiagnostics','navDiagnostics',
   'auditRouteMode','bodycamQa','fogDebugPalette','perfOverlay'])
  assert.equal(x[flag],true,flag);
 assert.equal(x.awareness,'');
 assert.equal(x.gpuWarmupEnabled,false);
 assert.equal(x.focusFx,'strong');
 assert.equal(initialMiniatureFocusMode(x.focusFx,'strong'),'strong');
 assert.equal(initialMiniatureFocusMode(null,'strong'),'off',
  'saved graphics preferences must not unshelve the focus pass');
});

test('A2: boot parser preserves legacy Number, repeated-key and invalid fallbacks',()=>{
 for(const query of [
  '?seed=0','?seed=-1','?seed=4294967296','?seed=4.2',
  '?seed=Infinity','?seed=NaN','?seed=','?seed=9007199254740991'
 ])assert.equal(parseBreachBootConfig(query).requestedSeed,null,query);
 assert.equal(parseBreachBootConfig('?seed=2&seed=100').requestedSeed,100);
 assert.equal(parseBreachBootConfig('?seed=0x10').requestedSeed,16);
 assert.equal(parseBreachBootConfig('?condition=').requestedCondition,0);
 assert.equal(parseBreachBootConfig('?condition=-10').requestedCondition,0);
 assert.equal(parseBreachBootConfig('?condition=12.5').requestedCondition,12.5);
 assert.equal(parseBreachBootConfig('?condition=oops').requestedCondition,null);
 assert.equal(parseBreachBootConfig('?condition=Infinity').requestedCondition,null);
 assert.equal(parseBreachBootConfig('?lighting=legacy').lighting,'day',
  'render scene still owns the graphic lighting QA comparison');
 assert.equal(parseBreachBootConfig('?scale=huge').scale,'standard');
 assert.equal(parseBreachBootConfig('?fogDebug=other').fogDebugPalette,false);
 assert.equal(parseBreachBootConfig('?gpuWarmup=1').gpuWarmupEnabled,true);
 assert.equal(parseBreachBootConfig(new URLSearchParams('?focusFx=replay')).focusFx,'replay');
});

test('A2: default and invalid intel preferences are harmless and save unchanged',()=>{
 const s=store();
 assert.equal(loadIntelPreference(s),'exterior-known');
 s.setItem(BREACH_STORAGE_KEYS.intelPreference,'invalid');
 assert.equal(loadIntelPreference(s),'exterior-known');
 assert.equal(saveIntelPreference('true-blind',s),true);
 assert.equal(s.getItem(BREACH_STORAGE_KEYS.intelPreference),'true-blind');
 assert.equal(loadIntelPreference(s),'true-blind');
 assert.equal(saveIntelPreference('floor-plan',null),false);
 assert.equal(loadIntelPreference(null),'exterior-known');
});

test('A2: Quick Play migration retains chosen cosmetics but never combat state',()=>{
 const old=initialRoster();
 old.members[0].callsign='EMBER';
 old.members[0].appearanceSeed=2345;
 old.members[0].injuries=3;
 old.members[0].magazine=0;
 old.members[0].reserve=0;
 old.members[0].weapon='shotgun';
 const storage=store({[BREACH_STORAGE_KEYS.legacyRoster]:JSON.stringify(old)});
 const roster=loadQuickPlayRoster(storage);
 const baseline=initialRoster().members[0];
 assert.equal(roster.members[0].callsign,'EMBER');
 assert.equal(roster.members[0].appearanceSeed,2345);
 assert.equal(roster.members[0].injuries,baseline.injuries);
 assert.equal(roster.members[0].weapon,baseline.weapon);
 assert.equal(roster.members[0].magazine,baseline.magazine);
 assert.equal(roster.members[0].reserve,baseline.reserve);
 assert.equal(storage.map.has(BREACH_STORAGE_KEYS.legacyRoster),false);
 assert.equal(storage.getItem(BREACH_STORAGE_KEYS.quickCosmetics),
  serializeQuickPlayCosmetics(roster));
 assert.ok(storage.removed.includes(BREACH_STORAGE_KEYS.legacyRoster));
 assert.equal(saveQuickPlayRoster(roster,storage),true);
 assert.equal(loadQuickPlayRoster(storage).members[0].callsign,'EMBER');
});

test('A2: existing new cosmetics win over old saves; denied migration never erases data',()=>{
 const old=initialRoster(),modern=initialRoster();
 old.members[0].callsign='OLD';modern.members[0].callsign='NEW';
 const sourceStorage=store({
  [BREACH_STORAGE_KEYS.legacyRoster]:JSON.stringify(old),
  [BREACH_STORAGE_KEYS.quickCosmetics]:serializeQuickPlayCosmetics(modern)
 });
 assert.equal(loadQuickPlayRoster(sourceStorage).members[0].callsign,'NEW');
 assert.equal(sourceStorage.map.has(BREACH_STORAGE_KEYS.legacyRoster),false);
 const blocked=store({[BREACH_STORAGE_KEYS.legacyRoster]:JSON.stringify(old)});
 blocked.setItem=()=>{throw Error('QuotaExceededError');};
 assert.equal(loadQuickPlayRoster(blocked).members[0].callsign,'OLD');
 assert.ok(blocked.map.has(BREACH_STORAGE_KEYS.legacyRoster),
  'failed migration may be retried but must not consume the only saved copy');
 assert.ok(!blocked.removed.length);
 assert.equal(saveQuickPlayRoster(modern,blocked),false);
 assert.equal(loadQuickPlayRoster(null).members.length,4);
});

test('A2: campaign loader keeps validated schema and exact serialized save shape',()=>{
 const campaign=newCampaign(1602);
 const storage=store();
 assert.equal(loadCampaignFromStorage(storage),null);
 assert.equal(saveCampaignToStorage(campaign,storage),true);
 assert.equal(storage.getItem(BREACH_STORAGE_KEYS.campaign),JSON.stringify(campaign));
 const loaded=loadCampaignFromStorage(storage);
 assert.equal(loaded?.seed,campaign.seed);
 assert.equal(loaded?.day,campaign.day);
 storage.setItem(BREACH_STORAGE_KEYS.campaign,'not json');
 assert.equal(loadCampaignFromStorage(storage),null);
 assert.equal(loadCampaignFromStorage(null),null);
 assert.equal(saveCampaignToStorage(campaign,null),false);
});

test('A2: operation history still validates and caps records without overwriting on read failure',()=>{
 const storage=store();
 const makeRecord=i=>({seed:i+1,kind:'clear',outcome:'success',
   grade:'A',elapsed:i+1,casualties:0});
 for(let i=0;i<HISTORY_LIMIT+5;i++)
  assert.equal(appendOperationHistory(makeRecord(i),storage),true);
 const history=loadOperationHistory(storage);
 assert.equal(history.length,HISTORY_LIMIT);
 assert.equal(history[0].seed,6);
 assert.equal(history.at(-1).seed,HISTORY_LIMIT+5);
 storage.map.set(BREACH_STORAGE_KEYS.operationHistory,'invalid json');
 assert.deepEqual(loadOperationHistory(storage),[]);
 const denied=store({[BREACH_STORAGE_KEYS.operationHistory]:'prior'});
 denied.getItem=()=>{throw Error('SecurityError');};
 assert.equal(appendOperationHistory(makeRecord(20),denied),false);
 assert.equal(denied.map.get(BREACH_STORAGE_KEYS.operationHistory),'prior');
 assert.equal(appendOperationHistory(makeRecord(20),null),false);
});

test('A2: safe generic preference helpers tolerate blocked browser storage',()=>{
 const denied=store();
 denied.getItem=()=>{throw Error('SecurityError');};
 denied.setItem=()=>{throw Error('QuotaExceededError');};
 denied.removeItem=()=>{throw Error('SecurityError');};
 assert.equal(readStoredText('key',denied),null);
 assert.equal(writeStoredText('key','value',denied),false);
 assert.equal(removeStoredText('key',denied),false);
 assert.equal(readStoredText(MINIATURE_FOCUS_STORAGE_KEY,denied),null);
 assert.equal(initialMiniatureFocusMode(null,'replay'),'off');
});

test('A2: composition has one boot parser and one mode/storage key contract',()=>{
 const tactical=['src/breach-main.ts','src/breach-runtime-loop.ts',
  'src/breach-quickplay-controller.ts','src/ui/breach-mission-screens.ts'];
 const main=source(tactical[0]);
 assert.match(main,/parseBreachBootConfig\(location\.search\)/);
 for(const path of tactical){
  const text=source(path);
  assert.ok(!text.includes('new URLSearchParams(location.search)'),path);
  assert.ok(!text.includes('localStorage.'),path);
 }
 for(const path of [
  'src/breach-main.ts','src/breach-runtime-loop.ts',
  'src/breach-quickplay-controller.ts','src/breach-campaign-flow.ts',
  'src/operator-studio-bridge.ts','src/breach-equipment-editor-bridge.ts',
  'src/breach-operations-board-controller.ts','src/breach-mission-controller.ts',
  'src/ui/breach-mission-debrief.ts','src/ui/breach-mission-screens.ts'
 ]){
  const text=source(path);
  assert.ok(text.includes("breach-app-mode.ts"),'shared CampaignMode: '+path);
  assert.ok(!text.includes("'menu'|'home'|'mission'|'quick'"),path);
 }
 for(const path of ['src/breach-main.ts','src/operator-studio.ts',
  'src/breach-campaign-flow.ts'])
  assert.ok(!source(path).includes('fieldwork3d.campaign.v1'),path);
 assert.ok(source('src/operator-studio.ts').includes('BREACH_STORAGE_KEYS.campaign'));
 assert.ok(source('src/breach-3d.ts').includes("get('lighting')!=='legacy'"));
 assert.ok(source('src/ui/breach-mission-screens.ts')
  .includes('MINIATURE_FOCUS_STORAGE_KEY'));
});
