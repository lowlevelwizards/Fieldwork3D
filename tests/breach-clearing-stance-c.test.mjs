import test from 'node:test';
import assert from 'node:assert/strict';
import {handlingIntentForMovement,teammateAheadForHandling}
 from '../src/breach-handling-context.ts';
import {handlingPose,fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {timedHandling,smoothHandling} from '../src/breach-handling-transition.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';

const ctx=(extra={})=>handlingIntentForMovement({
 order:{kind:'move'},running:false,squeezing:false,traversing:false,
 reloading:false,treating:false,hasContact:false,
 hasAuthoredWatch:false,speed:0,...extra
});
const stance=(intent,extra={})=>handlingPose({
 aim:0,moving:0,obstruction:false,friendlyNear:false,
 weapon:'carbine',intent,...extra
});

test('C11: authored squad orders choose distinct visual weapon intentions without editing the order',()=>{
 const order={kind:'move',entryDoorId:'ENTRY',p:{x:25,y:30}};
 const original=structuredClone(order);
 assert.equal(ctx({order}),'entry');
 assert.deepEqual(order,original);
 assert.equal(ctx({order:{kind:'move',stackDoorId:'ENTRY'}}),'stack');
 assert.equal(ctx({order:{kind:'wait',doorId:'ENTRY'}}),'door');
 assert.equal(ctx({order:{kind:'door',doorId:'ENTRY'}}),'door');
 assert.equal(ctx({order:{kind:'move',moveMode:'sprint'}}),'run');
 assert.equal(ctx({order,speed:15,hasAuthoredWatch:true}),'look',
  'the player-authored persistent WATCH keeps its own visual intent');
 assert.equal(ctx({order,hasContact:true}),'engage',
  'confirmed contact is visually urgent without modifying the authored order');
 assert.equal(ctx({order:{kind:'move'},speed:22}),'move');
 assert.equal(ctx({order:{kind:'move'},speed:0}),'hold');
});

test('C12: physical traversal and hands-busy context outrank carried/stale combat aim',()=>{
 const order={kind:'move',entryDoorId:'ENTRY'};
 assert.equal(ctx({order,hasContact:true,running:true}),'run');
 assert.equal(ctx({order,hasContact:true,squeezing:true,running:true}),'squeeze');
 assert.equal(ctx({order,hasContact:true,traversing:true}),'traverse');
 assert.equal(ctx({order,hasContact:true,reloading:true}),'reload');
 assert.equal(ctx({order,hasContact:true,treating:true}),'treat');
 assert.equal(stance('run',{aim:.98,moving:.98}),'low');
 assert.equal(stance('traverse',{aim:1}),'low');
 assert.equal(stance('reload',{aim:.91}),'low');
 assert.equal(stance('treat',{aim:.91}),'low');
 assert.equal(stance('squeeze',{aim:.98,moving:1}),'short');
 assert.equal(stance('run',{aim:.98,obstruction:true}),'short',
  'an actually blocked muzzle always owns the short-stock pose');
});

test('C13: four-person stack and threshold favor high-ready; interior sector clears to ready',()=>{
 for(const intent of ['stack','door','entry'])
  assert.equal(stance(intent,{friendlyNear:true,moving:.65}),'high',intent);
 assert.equal(stance('entry',{friendlyNear:false,moving:.65}),'ready');
 assert.equal(stance('stack',{friendlyNear:false,moving:.65}),'ready');
 assert.equal(stance('look',{friendlyNear:false,moving:.65}),'ready');
 assert.equal(stance('hold',{friendlyNear:false}),'ready');
 assert.equal(stance('move',{friendlyNear:false,moving:.65}),'low');
 assert.equal(stance('move',{friendlyNear:true,moving:.1}),'low');
 assert.equal(stance('move',{friendlyNear:false,moving:.1}),'ready');
 assert.equal(stance('engage',{aim:.45,threatRange:25}),'point');
 assert.equal(stance('engage',{aim:.96,threatRange:250}),'ads');
 assert.equal(stance('engage',{aim:.96,threatRange:30}),'point');
 assert.equal(stance('engage',{aim:.9,threatRange:85,weapon:'smg'}),'point');
 assert.equal(stance('engage',{aim:.9,threatRange:85,weapon:'rifle'}),'ads');
});

test('C14: teammate ahead is directional and includes near-body threshold crowding',()=>{
 const p={x:0,y:0};
 assert.equal(teammateAheadForHandling(p,0,[{x:5,y:0}]),true);
 assert.equal(teammateAheadForHandling(p,0,[{x:24,y:15}]),true);
 assert.equal(teammateAheadForHandling(p,0,[{x:-5,y:0}]),false);
 assert.equal(teammateAheadForHandling(p,0,[{x:3,y:0}]),false);
 assert.equal(teammateAheadForHandling(p,0,[{x:25,y:21}]),false);
 assert.equal(teammateAheadForHandling(p,Math.PI/2,[{x:0,y:20}]),true);
 assert.equal(teammateAheadForHandling(p,Math.PI/2,[{x:20,y:0}]),false);
});

test('C15: passive hysteresis smooths look/stack flicker, urgent aim and obstruction bypass it',()=>{
 assert.equal(stance('entry',{moving:.65,previous:'ready',heldFor:.08,
  friendlyNear:true}),'ready');
 assert.equal(stance('entry',{moving:.65,previous:'ready',heldFor:.18,
  friendlyNear:true}),'high');
 assert.equal(stance('engage',{aim:.65,threatRange:25,
  previous:'low',heldFor:0}),'point');
 assert.equal(stance('entry',{obstruction:true,previous:'high',
  heldFor:0}),'short');
 const t=timedHandling('low','high',.12,0,.24);
 assert.ok(t.alpha>0&&t.alpha<1);
 assert.equal(smoothHandling(0),0);
 assert.equal(smoothHandling(1),1);
});

test('C16: all six authored weapon stances maintain finite real physical geometry',()=>{
 for(const weapon of ['carbine','rifle','smg','shotgun'])
  for(const handling of ['low','high','ready','point','ads','short']){
   const p=fitWeaponPose({weapon,handling,yaw:.12,recoil:0,aimBlend:0});
   assert.ok(Number.isFinite(p.origin.x)&&Number.isFinite(p.stock.z),
    weapon+' '+handling);
   assert.ok(Number.isFinite(p.contactError)&&Number.isFinite(p.stockError));
  }
});

test('C17: combat muzzle fit remains driven by aim/physical clearance, not presentation context',()=>{
 const sample={x:30,z:40,heading:0,weaponYaw:0,weapon:'carbine',
  aim:.93,velocity:10,recoil:0,posture:'stand'};
 const first=muzzleAtShot(sample),second=muzzleAtShot({...sample});
 assert.deepEqual(first,second);
 assert.equal(stance('engage',{aim:sample.aim,threatRange:180}),'ads');
 assert.ok(Number.isFinite(first.yaw));
});
