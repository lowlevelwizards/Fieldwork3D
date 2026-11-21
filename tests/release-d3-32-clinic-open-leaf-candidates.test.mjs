/** D3.32: immutable Clinic D9 geometry witness behind the true motor
 * arrival test. One fully open solid leaf blocks the original straight
 * grid chord, but an exact pair of full-body swept legs is lawful.
 * No live order, actor, door, collision, or controller is modified.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,doorBlocksSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear,bodyClear} from '../src/breach-navigation.ts';
import {routeToNextOperableDoor} from '../src/breach-squeeze-route.ts';
import {selectColdStaleLeafPortalStage,
 earlyStableOpenLeafForBlockedAuthoredMove} from '../src/breach-physical-leaf-rejoin.ts';
import {canAutoOpenEnRoute} from '../src/breach-door.ts';

test('D3.32 Clinic D9: old chord blocked, two swept full-body legs clear',()=>{
 const site=generateSite(14490156,'standard',undefined,
  {mission:'intel'},{archetype:'clinic'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,14490156,'full-view',
  site.scale??'standard','intel',quiet,{enableCivilians:false});
 // Actual 45s frozen authored-Clinic final door states from immutable
 // D3.31 release artifact, not a hand-built altered collision world.
 const opened=new Map([
  ['FRONT',1.55],['D3',1],['D9',1.55],['D10',1],
  ['SERVICE',1],['COURT-1',1],['COURT-2',1]
 ]);
 for(const door of s.doors){
  const f=opened.get(door.id);
  if(f!==undefined)Object.assign(door,{
   open:true,openFraction:f,pushTarget:f,
   angularVelocity:0,heldBy:null
  });
 }
 const from={x:438.58021388219123,y:288.3752156662747};
 const first={x:432,y:352};
 const angle=Math.PI/4;
 const stage={x:from.x+Math.cos(angle)*32,
  y:from.y+Math.sin(angle)*32};
 const world=sessionWorldGeometry(s);
 const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,
  OPERATOR_RADIUS,world);
 const stand=p=>bodyClear(p,s.doors,OPERATOR_RADIUS,world);
 const d9=s.doors.find(d=>d.id==='D9');
 assert.ok(d9);
 assert.equal(d9.openFraction,1.55);
 assert.ok(pointToSegment(from,doorLeafSegment(d9))<
  OPERATOR_RADIUS+2,'real leaf contact, not a remote detour');
 assert.ok(stand(from)&&stand(stage)&&stand(first));
 assert.equal(sweep(from,first),false,
  'original first grid chord physically hits the open leaf');
 assert.equal(sweep(from,stage),true,'new first leg is fully swept');
 assert.equal(sweep(stage,first),true,'second leg rejoins SAME nav node');
 console.log('D332_D9_PHYSICAL_WITNESS',JSON.stringify({
  directBlocked:true,stage,fullBodyLegsClear:2,
  doorId:'D9',fraction:d9.openFraction
 }));
});

test('D3.32 P3B full-body cold open-leaf portal-stage is real and guarded',()=>{
 const site=generateSite(14490156,'standard',undefined,
  {mission:'intel'},{archetype:'clinic'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,14490156,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 // Real physical pose and final static angle in the frozen Clinic run.
 const fractions=new Map([['FRONT',1.55],['D3',1],['D8',1],
   ['D9',1.55],['D10',1],['SERVICE',1],
   ['COURT-1',1],['COURT-2',1]]);
 for(const door of s.doors){
  const f=fractions.get(door.id);
  if(f!==undefined)Object.assign(door,{
   open:true,openFraction:f,pushTarget:f,
   angularVelocity:0,heldBy:null});
 }
 const d9=s.doors.find(d=>d.id==='D9');
 assert.ok(d9);
 const from={x:430.32069912069454,y:278.5743135306611};
 const goal={x:315.5,y:585};
 const world=sessionWorldGeometry(s);
 const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,OPERATOR_RADIUS,world);
 const stand=p=>bodyClear(p,s.doors,OPERATOR_RADIUS,world);
 const portal=(a,b)=>routeToNextOperableDoor(a,b,s.doors,world);
 const terminal=(a,b)=>s.doors.some(door=>
  !door.locked&&!door.jammed&&!door.wedged&&!door.heldBy&&
  (door.openFraction??(door.open?1:0))<.72&&
  canAutoOpenEnRoute({kind:'move'},door.id)&&
  doorBlocksSegment(door,{a,b})&&
  sweptBodyClear(a,b,s.doors.filter(d=>d!==door),
    OPERATOR_RADIUS,world));
 const route=selectColdStaleLeafPortalStage(from,goal,d9,
  stand,sweep,portal,terminal);
 console.log('D332_VALE_COLD_STAGE',JSON.stringify({
  length:route.length,first:route[0],last:route.at(-1)}));
 assert.ok(route.length>=2,'physically joined to existing door portal');
 let previous=from;
 for(let i=0;i<route.length;i++){
  const point=route[i];
  if(i<route.length-1){
   assert.ok(stand(point),'ordinary waypoints are standable');
   assert.equal(sweep(previous,point),true,
    'all departure and intermediate motor segments are fully swept');
  }else{
   assert.ok(stand(point)&&sweep(previous,point)||terminal(previous,point),
    'only final leg may contact the one real operable door');
  }
  previous=point;
 }
 for(const blocked of [
  {open:false},{openFraction:.97},{locked:true},{jammed:true},
  {wedged:true},{heldBy:'enemy'},{angularVelocity:.3},
  {kind:'sliding'}
 ]){
  const invalid={...d9,...blocked};
  assert.deepEqual(
   selectColdStaleLeafPortalStage(from,goal,invalid,stand,sweep,portal,terminal),
   [],JSON.stringify(blocked));
 }
 assert.deepEqual(
  selectColdStaleLeafPortalStage(from,goal,d9,stand,()=>false,portal,terminal),
  [],'no path through blocked first strides');
 assert.deepEqual(
  selectColdStaleLeafPortalStage(from,goal,d9,stand,sweep,()=>[],terminal),
  [],'a staging footstep without an operable-door prefix has no authority');
 assert.deepEqual(
  selectColdStaleLeafPortalStage(from,goal,d9,stand,sweep,portal,()=>false),
  [],'cannot invent a pass through the final closed leaf');
});


test('D3.32 P3C early full-open leaf eligibility is physical, cold and owner-safe',()=>{
 const leaf={
  id:'D9',a:{x:423,y:285},b:{x:423,y:249},
  hinge:'a',swing:-1,kind:'hinged',open:true,
  openFraction:1.55,angularVelocity:0,locked:false,
  jammed:false,wedged:false,heldBy:null
 };
 const goal={x:512.05,y:585};
 const actor={
  side:'blue',p:{x:438.58,y:288.38},
  plan:[{id:14,kind:'move',p:goal}],
  nav:[{x:432,y:352},goal],
  blockedTime:.45,lastBlocker:'door',
  lastNavRepairAt:0,retryRouteAt:0,
  squeeze:false,traversal:null,traversalPending:false,
  autoSidestep:null,fireRetreatTarget:null,doorTraversal:null
 };
 const can=(patch={},door=leaf,denied=true)=>
  earlyStableOpenLeafForBlockedAuthoredMove(
    {...actor,...patch},goal,[door],10,denied);
 assert.equal(can()?.id,'D9','real denied first chord can probe before .85s');
 assert.equal(can({},leaf,false),null,'normal movement never probes');
 for(const patch of [
  {locked:true},{jammed:true},{wedged:true},{heldBy:'red'},
  {openFraction:.97},{angularVelocity:.1},{open:false}
 ])assert.equal(can({}, {...leaf,...patch}),null,JSON.stringify(patch));
 for(const patch of [
  {blockedTime:.34},{blockedTime:.85},{lastBlocker:'clear'},
  {lastNavRepairAt:9.8},{retryRouteAt:11},
  {plan:[{id:14,kind:'move',p:goal,entryDoorId:'D9'}]},
  {plan:[{id:14,kind:'move',p:goal,stackDoorId:'D9'}]},
  {traversalPending:true},{squeeze:true},{autoSidestep:{target:goal}},
  {doorTraversal:{doorId:'D9',maneuver:'outside-leaf'}}
 ])assert.equal(can(patch),null,JSON.stringify(patch));
});
