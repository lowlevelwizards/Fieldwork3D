import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {readEquipmentInteraction,sampleEquipmentGesture}
 from '../src/breach-equipment-interaction-pose.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

function actorAt(location='belt',timer=.08){
 const kit=initialEquipmentLoadout('carbine');
 return {plan:[{kind:'flash',aimPoint:{x:20,y:10},p:{x:0,y:0}}],
  actionTimer:timer,equipment:{...kit,fieldInventory:{version:1,stacks:[
   {itemId:'flashbang',quantity:1,location}]}},
  spareMagazines:[],flashCharges:1,wedgeRemaining:0,restraintRemaining:0};
}
test('F6.1: only a committed GO-time active flash order projects a gesture',()=>{
 const a=actorAt('belt');
 const before=structuredClone(a),q=readEquipmentInteraction(a);
 assert.equal(q.location,'belt');
 assert.equal(q.duration,.42);
 assert.ok(q.progress>0&&q.progress<1);
 assert.deepEqual(a,before,'posing does not spend the actual equipment');
 assert.equal(readEquipmentInteraction({...a,actionTimer:0}),null);
 assert.equal(readEquipmentInteraction({...a,flashCharges:0}),null);
 assert.equal(readEquipmentInteraction({...a,plan:[]}),null);
 assert.equal(readEquipmentInteraction({...a,plan:[{kind:'wait'}]}),null);
 assert.equal(readEquipmentInteraction({...a,plan:[{kind:'flash'}]}),null);
});
test('F6.1: source pouch and duration follow real field inventory',()=>{
 const r=readEquipmentInteraction(actorAt('rig',.12));
 const b=readEquipmentInteraction(actorAt('belt',.12));
 const p=readEquipmentInteraction(actorAt('backpack',.12));
 assert.deepEqual([r.location,b.location,p.location],['rig','belt','backpack']);
 assert.ok(r.duration<b.duration&&b.duration<p.duration);
 assert.equal(readEquipmentInteraction(actorAt('pocket',.12)),null,
  'flashbang pockets are not available in this inventory catalog');
});
test('F6.1: gesture sampler is pure and monotonic through actual action clock',()=>{
 const base=readEquipmentInteraction(actorAt('backpack',.12));
 const a=sampleEquipmentGesture({...base,progress:0});
 const b=sampleEquipmentGesture({...base,progress:.30});
 const c=sampleEquipmentGesture({...base,progress:.70});
 const d=sampleEquipmentGesture({...base,progress:1});
 assert.equal(a.inHand,false);
 assert.equal(b.inHand,false);
 assert.equal(c.inHand,true);
 assert.equal(d.inHand,false);
 assert.ok(b.reach>a.reach);
 assert.ok(c.lift>b.lift);
 assert.deepEqual(sampleEquipmentGesture({...base,progress:.70}),c);
});
test('F6.1: replay records real interaction clock, old film defaults neutral',()=>{
 const s=newSession(),a=s.operators[0];
 a.actionTimer=.23;
 const snap=snapshot(s),frame=snap.actors.find(x=>x.id===a.id);
 assert.equal(frame.actionTimer,.23);
 a.actionTimer=.57;
 applyReplayFrame(s,snap);
 assert.equal(a.actionTimer,.23);
 const old=structuredClone(snap);
 delete old.actors[0].actionTimer;
 a.actionTimer=.9;
 applyReplayFrame(s,old);
 assert.equal(a.actionTimer,0,'older films cannot borrow a later active gesture');
});
test('F6.1: action reader and shared pose are simulation non-authoritative',()=>{
 const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const reader=src('src/breach-equipment-interaction-pose.ts');
 const action=src('src/breach-pose-action-state.ts');
 const adapter=src('src/breach-3d.ts');
 assert.match(adapter,/equipmentInteraction:readEquipmentInteraction\(actor\)/);
 assert.match(action,/throwActive:throwActive\|\|equipmentActive/);
 assert.doesNotMatch(reader,/spendDeployedFieldItem|createOperatorRig|stepSession/);
});
