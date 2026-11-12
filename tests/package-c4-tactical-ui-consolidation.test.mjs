/** C4: HUD/selection interaction ownership and mobile-safe intent guards. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tacticalUiActionAvailability}
 from '../src/ui/tactical-command-affordances.ts';
import {reconcileTacticalUiSelection,nearestPaletteCandidate}
 from '../src/ui/tactical-selection-presentation.ts';
import {activeWatchTarget} from '../src/ui/active-watch-marker.ts';

const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const base={
 phase:'planning',replaying:false,actorHealth:3,
 planCount:2,undoCount:2,redoCount:1,flashRemaining:1,
 targetingArmed:false,activeWatchSelected:false
};
test('C4 one eligibility snapshot controls toolbar visuals and click boundaries',()=>{
 const ok=tacticalUiActionAvailability(base);
 assert.deepEqual(ok,{canAuthor:true,back:true,clear:true,
   undo:true,redo:true,wait:true,flash:true,sync:true});
 assert.deepEqual(tacticalUiActionAvailability({...base,phase:'running'}),
  {canAuthor:false,back:false,clear:false,undo:false,
   redo:false,wait:false,flash:false,sync:false});
 for(const blocked of [
  {...base,replaying:true},{...base,phase:'lost'},
  {...base,phase:'won'},{...base,actorHealth:0},
  {...base,actorHealth:null}
 ]){
  const value=tacticalUiActionAvailability(blocked);
  assert.equal(Object.values(value).some(Boolean),false);
 }
});
test('C4 BACK remains available for targeting/watch even without queued route',()=>{
 const empty={...base,planCount:0,undoCount:0,redoCount:0,flashRemaining:0};
 const plain=tacticalUiActionAvailability(empty);
 assert.equal(plain.back,false);assert.equal(plain.flash,false);
 assert.equal(plain.wait,true);assert.equal(plain.sync,true);
 assert.equal(tacticalUiActionAvailability({...empty,targetingArmed:true}).back,true);
 assert.equal(tacticalUiActionAvailability({...empty,activeWatchSelected:true}).back,true);
 assert.equal(tacticalUiActionAvailability({...empty,replaying:true,targetingArmed:true}).back,false);
});
test('C4 selected waypoint is preserved only while still in the current plan',()=>{
 const plan=[{id:11},{id:15}],watch={x:45,y:28};
 const before={selectedNode:15,selectedActiveWatch:true};
 assert.deepEqual(reconcileTacticalUiSelection(before,plan,watch),before);
 assert.deepEqual(reconcileTacticalUiSelection(before,[{id:11}],null),
  {selectedNode:null,selectedActiveWatch:false});
 assert.deepEqual(reconcileTacticalUiSelection(before,[],watch),
  {selectedNode:null,selectedActiveWatch:true});
 assert.deepEqual(before,{selectedNode:15,selectedActiveWatch:true},
  'selection reconciliation is read-only and never edits the caller');
 assert.deepEqual(plan,[{id:11},{id:15}]);
});
test('C4 executed WATCH survives route deletion but retires on RUN/down/release',()=>{
 const actor={health:3,pace:'walk',aimInstruction:{
  mode:'track',point:{x:90,y:100}}};
 assert.deepEqual(activeWatchTarget(actor),{x:90,y:100});
 assert.equal(reconcileTacticalUiSelection(
  {selectedNode:99,selectedActiveWatch:true},[],
  activeWatchTarget(actor)).selectedActiveWatch,true);
 assert.equal(activeWatchTarget({...actor,pace:'run'}),null);
 assert.equal(activeWatchTarget({...actor,health:0}),null);
 assert.equal(activeWatchTarget({...actor,aimInstruction:null}),null);
});
test('C4 palette chooses disclosed civilians at selected waypoint, not final route node',()=>{
 const first={id:'civil-first',p:{x:95,y:100},health:2};
 const last={id:'civil-last',p:{x:310,y:100},health:2};
 const down={id:'civil-down',p:{x:100,y:103},health:0,carriedById:null};
 const state=[first,last,down];
 const nearby=(at,kind)=>nearestPaletteCandidate(state,at,c=>
   (kind==='standing'?c.health>0:c.health<=0)&&
   c.id!=='hidden');
 assert.equal(nearby({x:100,y:100},'standing'),first);
 assert.equal(nearby({x:300,y:100},'standing'),last);
 assert.equal(nearby({x:100,y:100},'down'),down);
 assert.equal(nearby({x:200,y:100},'standing'),null);
 const tied=[{id:'stable-1',p:{x:10,y:10}},{id:'stable-2',p:{x:10,y:10}}];
 assert.equal(nearestPaletteCandidate(tied,{x:11,y:11},()=>true).id,'stable-1');
 assert.equal(state.length,3,'no sort or mutation');
});
test('C4 actual palette owner reads waypoint position before nearest target discovery',()=>{
 const palette=source('ui/tactical-palette-controller.ts');
 assert.match(palette,/const at=node\?\.p\?\?finalPoint\(a\)/);
 assert.match(palette,/const civilianAtPlan=nearestPaletteCandidate\(state\.civilians,at/);
 assert.match(palette,/const casualtyAtPlan=nearestPaletteCandidate\(state\.civilians,at/);
 assert.match(palette,/liveVisibility\(state,c\.p\)/);
 assert.doesNotMatch(palette,/paletteDistance\(finalPoint\(a\),c\.p\)<34/);
});
test('C4 HUD and click handlers consume the same gate and reject delayed context actions',()=>{
 const hud=source('ui/tactical-hud-controller.ts');
 for(const property of ['flash','back','clear','undo','redo','wait','sync'])
  assert.match(hud,new RegExp('ui\\.'+property+'\\.disabled=!availability\\.'+property));
 for(const property of ['back','clear','undo','redo','wait','flash','sync'])
  assert.match(hud,new RegExp('if\\(!available\\(\\)\\.'+property+'\\)return'));
 assert.match(hud,/button\.disabled/);
 assert.match(hud,/surface\.dataset\.owner!==config\.selected/);
 assert.match(hud,/surface\.hidden/);
 assert.match(hud,/targetId!==port\.selected/,
  'asynchronous route-clear modal may not edit another operator');
});
test('C4 selection and palette own only presentation state and do not replace game rules',()=>{
 const main=source('breach-main.ts');
 const palette=source('ui/tactical-palette-controller.ts');
 const hud=source('ui/tactical-hud-controller.ts');
 assert.match(main,/reconcileTacticalUiSelection\(/);
 assert.match(main,/selectedNode=selection\.selectedNode/);
 assert.match(main,/selectedActiveWatch=selection\.selectedActiveWatch/);
 assert.match(palette,/context\.dataset\.owner=selected/);
 assert.match(palette,/context\.dataset\.owner=''/);
 assert.match(hud,/quickStates\.dataset\.owner=shown\?actor!\.id:''/);
 assert.match(hud,/dispatchTacticalContextCommand\(/);
 assert.match(hud,/planWait\(port\.state,port\.selected,1\)/);
 assert.doesNotMatch(source('ui/tactical-command-affordances.ts'),
  /planMove\(|planWait\(|stepSession\(|document\.|window\./);
 assert.doesNotMatch(source('ui/tactical-selection-presentation.ts'),
  /planMove\(|stepSession\(|document\.|window\./);
});
