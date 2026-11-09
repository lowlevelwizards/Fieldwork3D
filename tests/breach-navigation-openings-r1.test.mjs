import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseEmbeddedCover} from '../src/breach-cover-release.ts';
import {passageDeadlockRetreatTarget,passageIdleYieldStep}
  from '../src/breach-passage.ts';
import {windowVisualHeadHeight,SERVING_COUNTER_VISUAL_HEIGHT}
  from '../src/breach-opening-proportions.ts';
import {eyeHeight,coverHeight} from '../src/breach-cover-height.ts';
import {WALL_VISUAL_HEIGHT,DOOR_CLEAR_VISUAL_HEIGHT}
  from '../src/breach-door-proportions.ts';

const p=(x,y)=>({x,y});
test('existing overlap with a table only permits short monotonic exits',()=>{
 const table={x:50,y:50,w:30,h:20,fixture:'table'};
 const bounds={minX:0,minY:0,maxX:200,maxY:200};
 const start=p(71,50);
 const result=releaseEmbeddedCover(start,p(120,50),[table],[],[],
   bounds,1.5);
 assert.ok(result,'a shallow furniture overlap should recover');
 assert.ok(result.x>start.x);
 assert.ok(Math.hypot(result.x-start.x,result.y-start.y)<=1.501);
 assert.equal(releaseEmbeddedCover(p(90,50),p(120,50),
   [table],[],[],bounds,1.5),null,
   'no arbitrary steering when standing free of the furniture');
});
test('retreat belongs to one stalled claimant, not two competing squeezes',()=>{
 const door={id:'D',a:p(90,100),b:p(126,100),open:true,
  openedAt:0,openFraction:1};
 const a={id:'A',p:p(108,90),goal:p(108,140),active:true,health:100,
  blockedTime:1.2,waitSeconds:1.8,side:'blue'};
 const b={id:'B',p:p(108,110),goal:p(108,70),active:true,health:100,
  blockedTime:1.2,waitSeconds:1.8,side:'blue'};
 const candidates=[a,b];
 assert.equal(passageDeadlockRetreatTarget(a,[door],candidates,()=>true),null);
 const retreat=passageDeadlockRetreatTarget(b,[door],candidates,()=>true);
 assert.ok(retreat);
 assert.ok(retreat.y>b.p.y,'loser backs away from its desired side');
 assert.equal(passageDeadlockRetreatTarget(b,[door],
   [a,{...b,waitSeconds:.3}],()=>true),null,
   'ordinary brief pauses are not deadlocks');
 assert.equal(passageDeadlockRetreatTarget(b,[door],candidates,()=>false),
   null,'physical swept clearance always vetoes the recovery');
});
test('idle doorway occupancy yields smoothly without moving a planned holder',()=>{
 const door={id:'D',a:p(90,100),b:p(126,100),open:true,
  openedAt:0,openFraction:1};
 const idle={id:'IDLE',p:p(108,100),goal:null,active:false,
  health:100,blockedTime:0,side:'blue'};
 const approach={id:'MOVE',p:p(108,76),goal:p(108,140),
  active:true,health:100,blockedTime:0,side:'blue'};
 const output=passageIdleYieldStep(idle,[door],[approach],()=>true);
 assert.ok(output);
 assert.ok(output.y>idle.p.y,'idle squadmate clears away from approaching side');
 assert.equal(passageIdleYieldStep({...idle,active:true},[door],[approach],
   ()=>true),null,'a deliberate moving operator is not auto-relocated');
 assert.equal(passageIdleYieldStep(idle,[door],[approach],()=>false),
   null,'an obstructed stationary operator must not teleport');
});
test('openings clear standing eye height while staying under the wall crown',()=>{
 const styles=['standard','tall','picture','bay','industrial',
   'clerestory','awning','wire','storefront'];
 for(const style of styles){
  const height=windowVisualHeadHeight(style);
  assert.ok(height>eyeHeight(false)+7,style+' eye clearance');
  assert.ok(height<WALL_VISUAL_HEIGHT,style+' wall clearance');
 }
 assert.ok(SERVING_COUNTER_VISUAL_HEIGHT<eyeHeight(false)-5);
 assert.ok(SERVING_COUNTER_VISUAL_HEIGHT<DOOR_CLEAR_VISUAL_HEIGHT);
});
test('window authoring and renderer share proportional heights without planar overlaps',async()=>{
 const fs=await import('node:fs');
 const src=fs.readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const windows=fs.readFileSync(new URL('../src/breach-windows.ts',import.meta.url),'utf8');
 const movement=fs.readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(src,/opening\.headHeight\?\?windowVisualHeadHeight\(style\)/);
 assert.match(windows,/windowVisualHeadHeight\(style\)/);
 assert.match(src,/SERVING_COUNTER_VISUAL_HEIGHT/);
 assert.match(src,/baseTop-1\.05,6,/);
 assert.match(movement,/traversalStepClear\(a\.p,planned\.landing,planned,world\)/);
 assert.match(movement,/landingClear/);
 assert.match(src,/height\+1\.15,6\.2/);
});

test('physical window and counter cover heights match modeled proportions',()=>{
 assert.equal(coverHeight({x:0,y:0,w:30,h:10,fixture:'window-sill',
   topHeight:SERVING_COUNTER_VISUAL_HEIGHT}),SERVING_COUNTER_VISUAL_HEIGHT);
 assert.equal(coverHeight({x:0,y:0,w:30,h:10,fixture:'window-sill'}),
   14,'ordinary legacy window sills retain original cover height');
 assert.equal(coverHeight({x:0,y:0,w:30,h:10,fixture:'glass-barrier',
   topHeight:windowVisualHeadHeight('storefront')}),
   windowVisualHeadHeight('storefront'));
});
