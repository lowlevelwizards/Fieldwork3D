import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activateSite} from '../src/breach-core.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,availableDeployments} from '../src/breach-game.ts';
import {BreachMissionController} from '../src/breach-mission-controller.ts';

function harness(mode='quick'){
 let rosterUpdates=0,rosterPreparations=0,campaignPreparations=0;
 let selectedScale='small',selectedIntel='exterior-known',lighting='night';
 const controller=new BreachMissionController({
   preferences:()=>({
     legacyStudy:false,civilianPreview:false,requestedCondition:null,
     selectedIntelMode:selectedIntel,requestedSiteScale:selectedScale,
     selectedLightingMode:lighting,mode
   }),
   randomSeed:()=>17,
   refreshQuickRoster:()=>{rosterUpdates++;},
   applyRoster:session=>{
     rosterPreparations++;
     const rook=team(session).find(a=>a.id==='rook');
     if(rook)rook.magazine=18;
   },
   applyCampaign:()=>{campaignPreparations++;},
   buildDossier:()=>undefined
 });
 return {controller,
   setNextPreferences:(intel,scale,light)=>{
     selectedIntel=intel;selectedScale=scale;lighting=light;
   },
   get calls(){return [rosterUpdates,rosterPreparations,campaignPreparations];}
 };
}
test('initial front-menu session has no site, without advancing the quick-play roster',()=>{
 try{
   const h=harness();
   const initial=h.controller.create({variant:0,withoutSite:true,initial:true});
   assert.equal(initial.site,undefined);
   assert.equal(initial.phase,'planning');
   assert.equal(h.controller.start.entryId,'FRONT');
   assert.deepEqual(h.calls,[0,1,1]);
   assert.equal(h.controller.recordInitial(initial).frames.length>0,true);
 }finally{activateSite(null);}
});
test('fresh mission uses authoritative newSession and respects requested intel/lighting',()=>{
 try{
   const h=harness();
   const s=h.controller.create({variant:1,seed:12});
   assert.equal(s.site?.seed,12);
   assert.equal(s.intel.mode,'exterior-known');
   assert.equal(s.lightingMode,'night');
   assert.equal(team(s).find(a=>a.id==='rook')?.magazine,18);
   assert.deepEqual(h.calls,[1,1,1]);
   assert.equal(h.controller.start.seed,12);
 }finally{activateSite(null);}
});
test('restart is the original map, insertion, kit and manifest despite next-site changes',()=>{
 try{
   const h=harness();
   const site=generateSite(12,'small');
   const s=h.controller.create({variant:1,seed:12,prebuiltSite:site});
   const alternate=availableDeployments(s).find(a=>a.id!=='FRONT');
   if(alternate){
     assert.equal(h.controller.selectNextDeployment(s,false),true);
     assert.equal(h.controller.entryId,alternate.id);
   }
   const first=structuredClone(h.controller.start.site);
   const initialMag=team(s)[0].magazine;
   h.controller.captureBeforeExecution(s,h.controller.recordInitial(s));
   s.started=true;
   s.site.rooms[0].w+=55;
   team(s)[0].magazine=0;
   h.setNextPreferences('full-view','large','day');
   const start=h.controller.restartSnapshot(s);
   const request=h.controller.restartRequest(start);
   const fresh=h.controller.create(request);
   h.controller.restoreStartingSetup(fresh,start);
   assert.deepEqual(fresh.site,first);
   assert.equal(fresh.intel.mode,'exterior-known');
   assert.equal(fresh.lightingMode,'night');
   assert.equal(h.controller.entryId,start.entryId);
   assert.equal(team(fresh)[0].magazine,initialMag);
   assert.equal(fresh.phase,'planning');
   assert.equal(fresh.started,false);
   assert.ok(team(fresh).every(a=>a.plan.length===0));
   assert.equal(h.controller.start.seed,12);
   // Mutating one restored site never changes the saved start.
   fresh.site.rooms[0].w+=8;
   assert.deepEqual(h.controller.start.site,first);
 }finally{activateSite(null);}
});
test('pre-GO restart captures current gear/entry without preserving queued orders',()=>{
 try{
   const h=harness(),s=h.controller.create({variant:0,seed:12});
   const a=team(s)[0];
   a.magazine=9;
   a.plan=[{id:s.nextId++,kind:'move',p:{...a.p}}];
   const start=h.controller.restartSnapshot(s);
   assert.equal(start.squad.find(x=>x.id===a.id)?.magazine,9);
   const restored=h.controller.create(h.controller.restartRequest(start));
   h.controller.restoreStartingSetup(restored,start);
   assert.equal(team(restored)[0].magazine,9);
   assert.equal(team(restored)[0].plan.length,0);
 }finally{activateSite(null);}
});
test('deployment selection is refused after planning or GO without modifying snapshot',()=>{
 try{
   const h=harness(),s=h.controller.create({variant:0,seed:12});
   const a=team(s)[0];
   const before=structuredClone(h.controller.start);
   a.plan=[{id:s.nextId++,kind:'move',p:{...a.p}}];
   assert.equal(h.controller.selectNextDeployment(s,false),false);
   assert.deepEqual(h.controller.start,before);
   a.plan=[];s.started=true;
   assert.equal(h.controller.selectNextDeployment(s,false),false);
   assert.deepEqual(h.controller.start,before);
 }finally{activateSite(null);}
});
test('transition cleanup precedes new session creation and mount gets fresh recording',()=>{
 try{
   const h=harness(),old=h.controller.create({variant:0,seed:12});
   const oldStart=h.controller.start;
   const sequence=[];
   const transition=h.controller.transition(old,{variant:1,seed:13,
     deferScene:true},{
       beforeReplace:previous=>{
         sequence.push('release');assert.equal(previous,old);
         assert.equal(h.controller.start,oldStart);
       },
       mount:({session,recorder,deferScene})=>{
         sequence.push('mount');
         assert.notEqual(session,old);
         assert.equal(session.site?.seed,13);
         assert.equal(deferScene,true);
         assert.ok(recorder.frames.length>=1);
       }
     });
   assert.deepEqual(sequence,['release','mount']);
   assert.equal(transition.session.site?.seed,13);
   assert.equal(h.controller.start.seed,13);
 }finally{activateSite(null);}
});
test('replay presentation does not overwrite living mission start/deployment',()=>{
 try{
   const h=harness(),s=h.controller.create({variant:0,seed:12});
   h.controller.captureBeforeExecution(s,h.controller.recordInitial(s));
   const snapshot=h.controller.start,recorder=h.controller.recordInitial(s);
   const film=h.controller.createReplaySession(recorder,s);
   assert.notEqual(film,s);
   assert.equal(film.site?.seed,s.site?.seed);
   assert.equal(h.controller.resumeLiveSession(s),s);
   assert.equal(h.controller.start,snapshot);
   assert.equal(h.controller.entryId,'FRONT');
 }finally{activateSite(null);}
});
test('main delegates lifecycle to one owner and keeps gameplay authoritative',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const controller=readFileSync(new URL('../src/breach-mission-controller.ts',import.meta.url),'utf8');
 for(const pattern of [/new BreachMissionController\(/,
   /missionController\.transition\(/,/missionController\.restartSnapshot\(/,
   /missionController\.restoreStartingSetup\(/,
   /missionController\.captureBeforeExecution\(/,
   /missionController\.createReplaySession\(/,
   /missionController\.resumeLiveSession\(/,
   /missionController\.refreshDeployment\(/]){
   assert.match(main,pattern);
 }
 assert.doesNotMatch(main,/newSession\(/);
 assert.doesNotMatch(main,/selectDeployment\(/);
 const release=main.slice(main.indexOf('function releaseMissionPresentation():void{'),
   main.indexOf('function mountMissionSession('));
 for(const teardown of [
   'replayDirector.reset()','audioController.endReplay()',
   'replayKnowledge.reset()','physicalActionRings.clear()',
   'replayMovementHistory=null']){
   assert.ok(release.includes(teardown),'missing teardown '+teardown);
 }
 assert.match(release,/campaignFlow\.resetOutcome\(\)/);
 const flow=readFileSync(new URL('../src/breach-campaign-flow.ts',import.meta.url),'utf8');
 assert.match(flow,/recordedOperation=null/);
 assert.match(controller,/newSession\(/);
 assert.match(controller,/selectDeployment\(/);
 assert.match(controller,/restoreMissionStartingTeam\(/);
});
