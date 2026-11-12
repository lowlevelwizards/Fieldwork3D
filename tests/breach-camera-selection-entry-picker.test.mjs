import test from 'node:test';
import assert from 'node:assert/strict';
import {fitBreach2DView,centerBreach2DView}
 from '../src/breach-2d-world-renderer.ts';
import {entryMapPoints} from '../src/ui/breach-entry-map-picker.ts';
import {BreachMissionController} from '../src/breach-mission-controller.ts';
import {newSession,team,availableDeployments} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('operator recenter is correct in 2D and preserves zoom and site bounds',()=>{
 const bounds={minX:80,minY:100,maxX:620,maxY:800};
 for(const [w,h,zoom] of [[390,844,2.4],[1024,768,1.2],[844,390,3.6]]){
  const point={x:537,y:255};
  const offsets=centerBreach2DView({cssW:w,cssH:h,zoom,bounds,point});
  const fit=fitBreach2DView({cssW:w,cssH:h,zoom,bounds,...offsets});
  assert.ok(Math.abs(fit.ox+point.x*fit.viewScale-w/2)<.001);
  assert.ok(Math.abs(fit.oy+point.y*fit.viewScale-h/2)<.001);
 }
});
test('3D selection centers once and never adds a per-frame camera follow',()=>{
 const stage=read('breach-3d.ts'),main=read('breach-main.ts');
 assert.match(stage,/focusOn\(point:Pt\):void/);
 assert.match(stage,/fitEntryMap\(\):void/);
 assert.match(main,/if\(center&&!replaying\)centerOperatorInView\(actor.p\)/);
 assert.match(main,/selectUnit\(owner,false\)/);
 assert.match(main,/selectUnit\(prior.owner,false\)/);
});
test('insertion map markers are physically anchored to the real door/window',()=>{
 const site={entrance:{x:5,y:6},
   doors:[{id:'FRONT',a:{x:20,y:40},b:{x:40,y:40}},
     {id:'SIDE',a:{x:120,y:70},b:{x:120,y:100}}],
   windows:[{id:'W2',x:170,y:240}]};
 const choices=[{id:'SIDE',kind:'secondary',status:'door',approach:{x:145,y:80}},
   {id:'W2',kind:'window',status:'break-first',approach:{x:200,y:240}}];
 const markers=entryMapPoints(site,choices);
 assert.deepEqual(markers.map(point=>point.point),[
   {x:30,y:40},{x:120,y:85},{x:170,y:240}]);
 assert.equal(markers[0].label,'FRONT ENTRANCE');
 assert.equal(markers.length,3);
});
test('map insertion confirms a specific choice; blocked plans cannot mutate it',()=>{
 const controller=new BreachMissionController({
  preferences:()=>({legacyStudy:false,civilianPreview:false,requestedCondition:null,
    selectedIntelMode:'exterior-known',requestedSiteScale:'small',
    selectedLightingMode:'day',mode:'quick'}),
  randomSeed:()=>12,refreshQuickRoster:()=>{},applyRoster:()=>{},
  applyCampaign:()=>{},buildDossier:()=>undefined
 });
 try{
  const session=controller.create({variant:0,seed:12});
  const available=availableDeployments(session).find(x=>x.id!=='FRONT');
  if(!available)return;
  assert.equal(controller.selectDeploymentById(session,false,available.id),true);
  assert.equal(controller.entryId,available.id);
  assert.equal(controller.start.entryId,available.id);
  assert.equal(controller.selectDeploymentById(session,false,'INVALID'),false);
  const a=team(session)[0];
  a.plan=[{id:11000,kind:'move',p:{...a.p}}];
  assert.equal(controller.selectDeploymentById(session,false,'FRONT'),false);
  assert.equal(controller.entryId,available.id);
 }finally{activateSite(null);}
});
test('change-entry invokes map picker rather than cycling immediately',()=>{
 const controller=read('breach-mission-controller.ts');
 const main=read('breach-main.ts');
 assert.match(controller,/controls\.onBrowse\(\)/);
 assert.doesNotMatch(controller,/controls\.onSelected\(\)/);
 assert.match(main,/entryMapPicker\.open\(\)/);
 assert.match(main,/recorder=missionController\.recordInitial\(state\)/);
});
