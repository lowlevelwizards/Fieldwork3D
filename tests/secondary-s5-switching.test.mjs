import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSecondaryEquipment,emptySecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {initialSecondarySwitch,requestSecondarySwitch,advanceSecondarySwitch,
 secondarySwitchSettled,secondarySwitchMotion,SWITCH_SECONDS}
 from '../src/secondary-switching.ts';
test('S5.1: unequipped/disabled operators cannot draw a phantom pistol',()=>{
 const first=initialSecondarySwitch();
 assert.equal(requestSecondarySwitch(first,'secondary',emptySecondaryEquipment()).accepted,false);
 assert.equal(requestSecondarySwitch(first,'secondary',undefined).state,first);
 const issue=initialSecondaryEquipment('rook','glock-g26');
 assert.equal(requestSecondarySwitch(first,'secondary',issue,false).accepted,false);
 assert.equal(advanceSecondarySwitch(first,1,issue,false),first);
});
test('S5.1: fixed-step draw is smooth, deterministic, and independent of 9mm ammunition',()=>{
 const issue=initialSecondaryEquipment('rook','glock-g19x');
 const before=JSON.stringify(issue),total=secondaryRoundTotal(issue);
 let state=requestSecondarySwitch(initialSecondarySwitch(),'secondary',issue).state;
 assert.equal(state.active,'primary');
 assert.equal(state.desired,'secondary');
 assert.equal(secondarySwitchMotion(state).handsBusy,true);
 for(let i=0;i<45;i++)state=advanceSecondarySwitch(state,1/60,issue);
 assert.equal(state.active,'secondary');
 assert.equal(state.fraction,1);
 assert.equal(secondarySwitchSettled(state),true);
 assert.equal(secondaryRoundTotal(issue),total);
 assert.equal(JSON.stringify(issue),before);
});
test('S5.1: reversing an interrupted draw or reholster never snaps progress',()=>{
 const issue=initialSecondaryEquipment('moss','glock-g19-gen3');
 const start=requestSecondarySwitch(initialSecondarySwitch(),'secondary',issue).state;
 const part=advanceSecondarySwitch(start,.20,issue);
 assert.ok(part.fraction>0&&part.fraction<1);
 const reverse=requestSecondarySwitch(part,'primary',issue).state;
 assert.equal(reverse.fraction,part.fraction);
 const towardHome=advanceSecondarySwitch(reverse,.12,issue);
 assert.ok(towardHome.fraction<part.fraction);
 assert.equal(towardHome.active,'primary');
 let drawn=start;
 for(let i=0;i<60;i++)drawn=advanceSecondarySwitch(drawn,1/60,issue);
 assert.equal(drawn.active,'secondary');
 const reverseHome=requestSecondarySwitch(drawn,'primary',issue).state;
 const halfway=advanceSecondarySwitch(reverseHome,.18,issue);
 const redrawn=requestSecondarySwitch(halfway,'secondary',issue).state;
 assert.equal(redrawn.fraction,halfway.fraction);
 assert.ok(advanceSecondarySwitch(redrawn,.12,issue).fraction>halfway.fraction);
});
test('S5.1: losing the pistol redirects the blend without granting an item or overwriting plans',()=>{
 const issue=initialSecondaryEquipment('ash','glock-g19-gen5-mos');
 const authoredPlan=[{id:7,kind:'move',p:{x:3,y:4}},{id:8,kind:'watch',p:{x:5,y:6}}];
 const prior=JSON.stringify(authoredPlan);
 let state=requestSecondarySwitch(initialSecondarySwitch(),'secondary',issue).state;
 state=advanceSecondarySwitch(state,.14,issue);
 const removed=advanceSecondarySwitch(state,.14,emptySecondaryEquipment());
 assert.equal(removed.desired,'primary');
 assert.ok(removed.fraction<state.fraction);
 assert.equal(JSON.stringify(authoredPlan),prior);
 assert.equal(SWITCH_SECONDS,.68);
});
