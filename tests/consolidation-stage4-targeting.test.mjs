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
 // A6 correctly moved toolbar event binding out of the entrypoint.
 const main=source('src/breach-main.ts');
 const hud=source('src/ui/tactical-hud-controller.ts');
 assert.match(main,/hudController\.bindToolbar\(/);
 const start=hud.indexOf("port.ui.back.addEventListener('click'");
 assert.ok(start>=0,'BACK is bound by the tactical HUD owner');
 const back=hud.slice(start,hud.indexOf("port.ui.clear.addEventListener",start));
 assert.match(back,/if\(targeting\.isArmed\)\{port\.cancelTargeting\(\);return;\}/);
 assert.ok(back.indexOf('targeting.isArmed')<back.indexOf('backOne(port.state,port.selected)'),
  'target cancellation must precede waypoint deletion');
 assert.match(back,/if\(port\.selectedActiveWatch\)/);
 assert.match(hud,/ui\.back\.disabled=!availability\.back/);
 const eligibility=source('src/ui/tactical-command-affordances.ts');
 assert.match(eligibility,/back:canAuthor&&\(input\.targetingArmed\|\|input\.activeWatchSelected\|\|/);
 assert.match(back,/if\(!available\(\)\.back\)return/);
});
test('A4 rejection leaves push/suppress/flash/look armed; evacuation is one-shot',()=>{
 // A6 relocated the single ground-authoring boundary into the existing
 // pointer-command owner. Assert the same A4 commit/cancel rules there.
 const pointer=source('src/breach-pointer-command-controller.ts');
 const start=pointer.indexOf('export function commitTacticalGroundCommand(');
 assert.ok(start>=0);
 const tap=pointer.slice(start,pointer.indexOf('const beforeRoute=',start));
 for(const kind of ['pushMode','firePlacement','flashMode'])
  assert.ok(tap.includes('if(port.targeting.'+kind+')'));
 const push=tap.slice(tap.indexOf('if(port.targeting.pushMode)'),
  tap.indexOf('const evacuation='));
 assert.match(push,/if\(!accepted\)port\.rejectAt[\s\S]*?else\{\s*port\.targeting\.reset\(\)/);
 const suppress=tap.slice(tap.indexOf('if(port.targeting.firePlacement)'),
  tap.indexOf('if(port.targeting.flashMode)'));
 assert.match(suppress,/if\(!accepted\)port\.rejectAt[\s\S]*?else\{[\s\S]*?port\.targeting\.reset\(\)/);
 const flash=tap.slice(tap.indexOf('if(port.targeting.flashMode)'),
  tap.indexOf('if(port.targeting.isFacing)'));
 assert.match(flash,/planDoorFlash\(port\.state,port\.selected,doorId,pt\):\s*planFlash\(port\.state,port\.selected,pt\)/);
 assert.match(flash,/if\(!accepted\)port\.rejectAt[\s\S]*?else\{[\s\S]*?port\.targeting\.reset\(\)/);
 assert.match(tap,/if\(port\.targeting\.isFacing\)[\s\S]*?if\(committed\)port\.targeting\.reset\(\)/);
 assert.match(tap,/const evacuation=port\.targeting\.evacMode;\s*if\(evacuation\)\{\s*port\.targeting\.reset\(\)/);
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
  /commitTacticalGroundCommand\(/,
  /hudController\.bindToolbar\(/
 ])assert.match(main,pattern);
 for(const legacy of [/let flashMode=false/,/let evacMode:/,/let firePlacement:/,
  /hudController\.facing\.looking=false/])assert.doesNotMatch(main,legacy);
 const pure=source('src/breach-tactical-interaction-state.ts');
 assert.doesNotMatch(pure,/^import\s/m);
 assert.doesNotMatch(pure,/\b(?:window|document|localStorage|newSession|stepSession)\b/);
 const hudSrc=source('src/ui/tactical-hud-controller.ts');
 assert.match(hudSrc,/get facing\(\)\{return targeting\.facing;\}/);
 assert.match(hudSrc,/targeting\.armDoorFlash\(door\.id\)/);
 assert.match(hudSrc,/targeting\.armEvac\(target\.id,'drag'\)/);
 assert.match(hudSrc,/targeting\.armEvac\(target\.id,'carry'\)/);
 assert.match(hudSrc,/if\(targeting\.isArmed\)\{port\.cancelTargeting\(\);return;\}/);
 const pointer=source('src/breach-pointer-command-controller.ts');
 assert.match(pointer,/export function commitTacticalGroundCommand\(/);
});
