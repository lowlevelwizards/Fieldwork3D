import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTacticalHudController} from '../src/ui/tactical-hud-controller.ts';
import {availablePaletteActions}
  from '../src/ui/tactical-palette-controller.ts';

const options={
  door:false,node:false,flashRemaining:2,
  posture:'stand',pace:'walk',firePolicy:'engage',
  reserve:50,magazine:20
};
test('LOOK / WATCH are UI arming modes, never plans or gameplay mutations',()=>{
 const hud=createTacticalHudController();
 assert.equal(hud.facing.looking,false);
 assert.equal(hud.toggleFacing('look',null),true);
 assert.deepEqual(hud.facing,{looking:true,lookMode:'look',armedOrigin:'here'});
 assert.equal(hud.toggleFacing('look',null),false);
 assert.equal(hud.toggleFacing('watch',15),true);
 assert.deepEqual(hud.facing,{looking:true,lookMode:'watch',armedOrigin:'end'});
 assert.match(hud.message({phase:'planning',replaying:false,flashMode:false,
   pushMode:false,selectedNode:15,selectedActiveWatch:false}),/WATCH ARMED/);
 assert.equal(hud.toggleFacing('watch',15),false);
 assert.match(hud.message({phase:'planning',replaying:false,flashMode:false,
   pushMode:false,selectedNode:15,selectedActiveWatch:true}),/WATCH TARGET/);
});
test('palette exposes only WATCH retarget and release when active point is selected',()=>{
 const available=availablePaletteActions(true,options);
 assert.deepEqual(available.map(x=>x.id),['ctxWatch','ctxDelete']);
 assert.equal(available[0].label,'RETARGET');
 assert.equal(available[1].label,'DELETE WATCH');
 assert.ok(available.every(x=>!x.disabled));
});
test('palette preserves door-specific controls and disables depleted flash',()=>{
 const closed=availablePaletteActions(false,{
   ...options,door:true,flashRemaining:0,
   availableTools:['ram','wedge']
 });
 assert.deepEqual(closed.map(x=>x.id),
   ['ctxOpen','ctxKick','ctxDoorFlash','ctxTool-ram','ctxTool-wedge']);
 assert.equal(closed.find(x=>x.id==='ctxDoorFlash')?.disabled,true);
 const open=availablePaletteActions(false,{
   ...options,door:true,doorOpen:true
 });
 assert.deepEqual(open.map(x=>x.id),['ctxClose','ctxDoorFlash']);
});
test('palette choices remain read-only descriptions, game decides validity',()=>{
 const source={...options,nearMovable:true,nearWindow:true,watchActive:true,
   node:true,aimLabel:'watch',nodeFirePolicy:'suppress'};
 const before=JSON.stringify(source);
 const choices=availablePaletteActions(false,source);
 assert.equal(JSON.stringify(source),before);
 assert.ok(choices.some(x=>x.id==='ctxPush'));
 assert.ok(choices.some(x=>x.id==='ctxWindow'));
 assert.ok(choices.some(x=>x.id==='ctxDelete'));
 assert.equal(choices.find(x=>x.id==='ctxWatch')?.pressed,true);
 assert.equal(choices.find(x=>x.id==='ctxFire')?.group,'state');
});
test('rejection feedback derives from the user-facing error only',()=>{
 const hud=createTacticalHudController();
 const emitted=[];
 hud.feedback.emit=(...args)=>emitted.push(args);
 const point={x:42,y:71};
 let warningCount=0;
 hud.rejectAttempt(point,'NO WALKABLE ROUTE',()=>warningCount++);
 hud.completeAction(point,'DOOR NOT REACHABLE FROM THAT POINT','IGNORED',
   failed=>{if(failed)warningCount++;});
 hud.completeAction(point,null,'OPEN',failed=>{
   assert.equal(failed,false);
 });
 assert.deepEqual(emitted.map(x=>x[0]),['error','error','command']);
 assert.deepEqual(emitted.map(x=>x[2]),['ROUTE','DOOR','OPEN']);
 assert.equal(warningCount,2);
});
test('stage 7 moves display and hint logic out of breach main, not order validators',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const commands=readFileSync(new URL('../src/breach-tactical-context-command.ts',import.meta.url),'utf8');
 const palette=readFileSync(new URL('../src/ui/tactical-palette-controller.ts',
   import.meta.url),'utf8');
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',
   import.meta.url),'utf8');
 assert.match(main,/createTacticalHudController\(targeting\)/);
 assert.match(main,/const targeting=createTacticalInteractionState\(\)/);
 assert.match(main,/createTacticalPaletteController\(\{/);
 assert.match(main,/paletteController\.showFromAuthorizedState\(/);
  assert.match(palette,/show\(\{/);
 assert.match(main,/hudController\.renderSession\(/);
  assert.match(hud,/renderGuidance\(\{/);
 assert.match(main,/hudController\.renderQuickStates\(/);
 assert.match(main,/hudController\.completeAction\(/);
 assert.doesNotMatch(main,/new PaletteMotion\(/);
 assert.doesNotMatch(main,/placeContextMenu\(/);
 assert.doesNotMatch(main,/new TacticalFeedback\(/);
 assert.doesNotMatch(main,/function message\(\)/);
 for(const token of ['planWatch(state,selected','planAim(state,selected',
   'planMove(state,selected','planEntryTool(state,selected',
   'planDoorFlash(state,selected','setFirePolicy(state,selected']){
   assert.ok((main+commands).includes(token),'game rule must remain authoritative: '+token);
 }
 for(const controller of [palette,hud]){
   assert.doesNotMatch(controller,/planMove\(|planWatch\(|planDoorFlash\(|stepSession\(/);
 }
});
