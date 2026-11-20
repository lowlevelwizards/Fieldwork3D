import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,planWait,planSwitchWeaponAt} from '../src/breach-game.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {executeTacticalUtilityOrder}
 from '../src/breach-order-utility.ts';
import {snapshot,MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {initialSecondarySwitch,requestSecondarySwitch,advanceSecondarySwitch,
 advanceInterruptedSecondarySwitch,secondarySwitchSettled}
 from '../src/secondary-switching.ts';

test('S5.2: only actual operator-owned Glock can be authored into the movement timeline',()=>{
 const s=newSession(),a=team(s)[0];
 assert.equal(planSwitchWeaponAt(s,a.id,'secondary'),false);
 a.equipment={...initialEquipmentLoadout(),
  secondary:initialSecondaryEquipment(a.id,'glock-g19-gen5-mos')};
 assert.equal(planWait(s,a.id,.5),true);
 const before=a.plan.map(x=>x.id);
 assert.equal(planSwitchWeaponAt(s,a.id,'secondary'),true);
 assert.deepEqual(a.plan.slice(1).map(x=>x.id),before);
 assert.equal(a.plan[0].weaponHand,'secondary');
 assert.equal(a.plan[0].kind,'switch-weapon');
 assert.equal(planSwitchWeaponAt(s,a.id,'primary',100000),false);
 assert.equal(a.plan.length,2);
});
test('S5.2: queued weapon switch progresses smoothly, conserves ammo, and completes exactly once',()=>{
 const s=newSession(),a=team(s)[0];
 const kit=initialSecondaryEquipment(a.id,'glock-g19x');
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 a.secondarySwitch=initialSecondarySwitch();
 assert.equal(planSwitchWeaponAt(s,a.id,'secondary'),true);
 const priorAmmo=secondaryRoundTotal(kit),priorPrimary=a.magazine;
 let completions=0;
 const hooks={pop(actor){actor.plan.shift();completions++;},
  notify(){},beginReload(){return false;},
  fail(_s,_a,_n,reason){throw Error(reason)},clearIssue(){},
  rotate(){return true},battleEvent(){}};
 const authored=a.plan[0];
 for(let i=0;i<60;i++){
  if(!a.plan.length)break;
  executeTacticalUtilityOrder(s,a,authored,1/60,hooks);
 }
 assert.equal(completions,1);
 assert.equal(a.secondarySwitch.active,'secondary');
 assert.equal(a.secondarySwitch.fraction,1);
 assert.equal(secondaryRoundTotal(kit),priorAmmo);
 assert.equal(a.magazine,priorPrimary);
 const protectedCode=readFileSync(
  new URL('../src/breach-firing-pipeline.ts',import.meta.url),'utf8');
 assert.match(protectedCode,/a\.secondarySwitch\?\.fraction/);
 assert.match(protectedCode,/a\.secondarySwitch\?\.desired==='secondary'/);
});

test('S5.2: cancellation reverses partial draw and does not leave a hidden-primary lockout',()=>{
 const issue=initialSecondaryEquipment('rook','glock-g19x');
 const requested=requestSecondarySwitch(initialSecondarySwitch(),'secondary',issue).state;
 const partial=advanceSecondarySwitch(requested,.31,issue);
 assert.equal(partial.active,'primary');
 assert.ok(partial.fraction>0&&partial.fraction<1);
 const after=advanceInterruptedSecondarySwitch(partial,.12,issue);
 assert.equal(after.desired,'primary');
 assert.ok(after.fraction<partial.fraction);
 let s=after;
 for(let i=0;i<40;i++)s=advanceInterruptedSecondarySwitch(s,1/60,issue);
 assert.equal(secondarySwitchSettled(s),true);
 assert.equal(s.active,'primary');
 assert.equal(s.fraction,0);
 assert.equal(secondaryRoundTotal(issue),51);
});
test('S5.2: removing an issued Glock from a selected operator safely returns to primary',()=>{
 const issue=initialSecondaryEquipment('rook','glock-g19-gen3');
 let s=requestSecondarySwitch(initialSecondarySwitch(),'secondary',issue).state;
 for(let i=0;i<45;i++)s=advanceSecondarySwitch(s,1/60,issue);
 assert.equal(s.active,'secondary');
 for(let i=0;i<50;i++)s=advanceInterruptedSecondarySwitch(s,1/60,undefined);
 assert.equal(s.active,'primary');
 assert.equal(s.fraction,0);
 assert.equal(s.desired,'primary');
});

test('S10 foundation: film stores sidearm state, interpolates draw, resets absent legacy selection on seek',()=>{
 const s=newSession(),a=team(s)[0];
 const kit=initialSecondaryEquipment(a.id,'glock-g19x');
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 const film=new MissionRecorder();
 film.capture(s,true);
 const old=film.frames[0].actors.find(x=>x.id===a.id);
 assert.deepEqual(old.secondarySwitch,initialSecondarySwitch());
 a.secondarySwitch=requestSecondarySwitch(a.secondarySwitch,'secondary',kit).state;
 a.secondarySwitch=advanceSecondarySwitch(a.secondarySwitch,.2,kit);
 s.seconds=.1;
 film.capture(s,true);
 const second=film.frames[1].actors.find(x=>x.id===a.id);
 assert.ok(second.secondarySwitch.fraction>0);
 const sampled=film.sample(.05).actors.find(x=>x.id===a.id);
 assert.ok(sampled.secondarySwitch.fraction>0);
 assert.ok(sampled.secondarySwitch.fraction<second.secondarySwitch.fraction);
 applyReplayFrame(s,film.frames[0]);
 assert.equal(a.secondarySwitch.active,'primary');
 assert.equal(a.secondarySwitch.fraction,0);
 // Old films have no selected-hand field: seeking backward may never
 // inherit whichever pistol the live actor had selected later.
 const legacy={...film.frames[0],actors:film.frames[0].actors.map(x=>{
  const {secondarySwitch:_omitted,...rest}=x;return rest;
 })};
 a.secondarySwitch=advanceSecondarySwitch(
  requestSecondarySwitch(a.secondarySwitch,'secondary',kit).state,.15,kit);
 assert.ok(a.secondarySwitch.fraction>0);
 applyReplayFrame(s,legacy);
 assert.deepEqual(a.secondarySwitch,initialSecondarySwitch());
});
