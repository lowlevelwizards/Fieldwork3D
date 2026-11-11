import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTacticalInteractionState} from '../src/breach-tactical-interaction-state.ts';
import {createTacticalHudController} from '../src/ui/tactical-hud-controller.ts';
import {newSession,team,planWatch,planMove} from '../src/breach-game.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const fake=()=>({hidden:true,textContent:'',dataset:{},attributes:{},
 setAttribute(key,val){this.attributes[key]=String(val);}});

test('A4 one active target: every tool switch atomically replaces the previous intent',()=>{
 const t=createTacticalInteractionState();
 const arm=[()=>t.toggleFacing('look',null),()=>t.toggleFacing('watch',9),
  ()=>t.toggleFlash(),()=>t.armDoorFlash('door-2'),()=>t.armPush(),
  ()=>t.armSuppress(),()=>t.armEvac('victim-1','drag'),
  ()=>t.armEvac('victim-2','carry')];
 const modes=['look','watch','flash','flash','push','suppress','evac','evac'];
 arm.forEach((run,i)=>{
  run();assert.equal(t.mode.kind,modes[i]);assert.equal(t.isArmed,true);
  assert.equal(Number(t.isFacing)+Number(t.flashMode)+
   Number(t.pushMode)+Number(!!t.firePlacement)+Number(!!t.evacMode),1);
 });
 assert.deepEqual(t.mode,{kind:'evac',patientId:'victim-2',transport:'carry'});
 assert.equal(t.flashDoorId,null);assert.equal(t.firePlacement,null);
 assert.equal(t.label,'CARRY');assert.ok(Object.isFrozen(t.mode));
});

test('A4 HERE/END LOOK/WATCH toggles, swaps and persists no second active mode',()=>{
 const t=createTacticalInteractionState();
 assert.deepEqual(t.facing,{looking:false,lookMode:'look',armedOrigin:'end'});
 assert.equal(t.toggleFacing('look',null),true);
 assert.deepEqual(t.mode,{kind:'look',origin:'here'});
 assert.equal(t.toggleFacing('look',null),false);
 assert.equal(t.mode.kind,'none');
 assert.equal(t.toggleFacing('watch',12),true);
 assert.deepEqual(t.facing,{looking:true,lookMode:'watch',armedOrigin:'end'});
 assert.equal(t.toggleFacing('look',null),true);
 assert.deepEqual(t.facing,{looking:true,lookMode:'look',armedOrigin:'here'});
 assert.equal(t.toggleFacing('watch',12),true);
 assert.equal(t.toggleFacing('watch',12),false);
 assert.deepEqual(t.facing,{looking:false,lookMode:'watch',armedOrigin:'end'});
});

test('A4 door/normal FLASH never inherit stale targets; cancel/reset are idempotent',()=>{
 const t=createTacticalInteractionState();
 t.armDoorFlash('door-a');assert.equal(t.flashDoorId,'door-a');
 assert.equal(t.toggleFlash(),false);assert.equal(t.flashDoorId,null);
 assert.equal(t.toggleFlash(),true);assert.equal(t.flashDoorId,null);
 t.armDoorFlash('door-b');t.armSuppress();
 assert.equal(t.flashDoorId,null);
 t.armEvac('patient','drag');assert.deepEqual(t.evacMode,{patientId:'patient',mode:'drag'});
 t.armPush();assert.equal(t.evacMode,null);
 assert.equal(t.cancel(),true);assert.equal(t.cancel(),false);
 t.armEvac('new','carry');assert.equal(t.reset(),true);assert.equal(t.reset(),false);
});

test('A4 temporary WATCH cancellation preserves authored route and persistent WATCH',()=>{
 const s=newSession(),actor=team(s)[0],t=createTacticalInteractionState();
 assert.equal(planWatch(s,actor.id,{x:actor.p.x+60,y:actor.p.y-40}),true);
 const plan=JSON.stringify(actor.plan),watch=JSON.stringify(actor.aimInstruction);
 t.toggleFacing('watch',null);assert.equal(t.cancel(),true);
 assert.equal(JSON.stringify(actor.plan),plan);
 assert.equal(JSON.stringify(actor.aimInstruction),watch);
});

test('A4 PUSH Back always cancels before deleting selected waypoint',()=>{
 const s=newSession(),actor=team(s)[0],t=createTacticalInteractionState();
 assert.equal(planMove(s,actor.id,{x:actor.p.x+22,y:actor.p.y-30}),true);
 const plan=JSON.stringify(actor.plan);
 t.armPush();assert.equal(t.cancel(),true);
 assert.equal(JSON.stringify(actor.plan),plan);
 const main=source('src/breach-main.ts');
 const back=main.slice(main.indexOf("ui.back.addEventListener('click'"),
   main.indexOf("ui.moss.addEventListener('click'"));
 assert.match(back,/if\(targeting\.isArmed\)\{cancelTargeting\(\);return;\}/);
 assert.ok(back.indexOf('targeting.isArmed')<back.indexOf('backOne(state,selected)'));
 assert.match(back,/if\(selectedActiveWatch\)/);
 assert.match(main,/ui\.back\.disabled=!targeting\.isArmed&&!selectedActiveWatch&&!active\?\.plan\.length/);
});

test('A4 rejection leaves push/suppress/flash/look armed; evacuation is one-shot',()=>{
 const main=source('src/breach-main.ts');
 const tap=main.slice(main.indexOf('function useSelectedGround('),
  main.indexOf('const beforeRoute=',main.indexOf('function useSelectedGround(')));
 for(const kind of ['pushMode','firePlacement','flashMode'])
  assert.ok(tap.includes('if(targeting.'+kind+')'));
 assert.match(tap,/if\(targeting\.pushMode\)[\s\S]*?if\(!accepted\)rejectAt[\s\S]*?else\{\s*targeting\.reset\(\)/);
 assert.match(tap,/if\(targeting\.flashMode\)[\s\S]*?if\(!accepted\)rejectAt[\s\S]*?else\{[\s\S]*?targeting\.reset\(\)/);
 assert.match(tap,/if\(targeting\.isFacing\)[\s\S]*?if\(committed\)targeting\.reset\(\)/);
 assert.match(tap,/const evacuation=targeting\.evacMode;\s*if\(evacuation\)\{\s*targeting\.reset\(\)/);
 assert.match(tap,/planDoorFlash\(state,selected,doorId,pt\):\s*planFlash\(state,selected,pt\)/);
});

test('A4 HUD derives labels, cancel affordance and hints from target state',()=>{
 const t=createTacticalInteractionState(),hud=createTacticalHudController(t);
 const cancel=fake(),hint=fake();
 const draw=(phase='planning',replaying=false)=>
  hud.renderTargetMode({cancelTarget:cancel,hint,phase,replaying});
 const check=label=>{draw();assert.equal(cancel.hidden,!label);
  assert.equal(hint.dataset.targetMode,label);
  if(label)assert.equal(cancel.textContent,'✕ CANCEL '+label);};
 check('');t.toggleFacing('look',null);check('LOOK');
 t.toggleFacing('watch',23);check('WATCH');
 t.toggleFlash();check('FLASH');t.armPush();check('PUSH');
 t.armSuppress();check('SUPPRESS');t.armEvac('p','drag');check('DRAG');
 t.armEvac('p','carry');check('CARRY');
 assert.match(hud.message({phase:'planning',replaying:false,
  selectedNode:null,selectedActiveWatch:false}),/CARRY ARMED/);
 draw('running');assert.equal(cancel.hidden,true);
 draw('planning',true);assert.equal(cancel.hidden,true);
 t.reset();check('');
});

test('A4 all entrypoints use one owner; mission, replay, GO and selection clear it',()=>{
 const main=source('src/breach-main.ts');
 for(const pattern of [
  /const targeting=createTacticalInteractionState\(\)/,
  /selected=id;targeting\.reset\(\)/,
  /resetTargeting:\(\)=>\{targeting\.reset\(\);\}/,
  /function mountMissionSession[\s\S]*?targeting\.reset\(\)/,
  /targetArmed:\(\)=>targeting\.isArmed/,
  /isLooking:\(\)=>targeting\.isFacing/,
  /if\(state\.phase!=='planning'\)targeting\.reset\(\)/,
  /targeting\.armDoorFlash\(door\.id\)/,
  /targeting\.armEvac\(target\.id,'drag'\)/,
  /targeting\.armEvac\(target\.id,'carry'\)/
 ])assert.match(main,pattern);
 for(const legacy of [/let flashMode=false/,/let evacMode:/,/let firePlacement:/,
  /hudController\.facing\.looking=false/])assert.doesNotMatch(main,legacy);
 const pure=source('src/breach-tactical-interaction-state.ts');
 assert.doesNotMatch(pure,/^import\s/m);
 assert.doesNotMatch(pure,/\b(?:window|document|localStorage|newSession|stepSession)\b/);
 const hudSrc=source('src/ui/tactical-hud-controller.ts');
 assert.match(hudSrc,/get facing\(\)\{return targeting\.facing;\}/);
});
