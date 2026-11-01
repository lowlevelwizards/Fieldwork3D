import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialArmorIntegrity,resolveArmorImpact} from '../src/equipment-armor.ts';
import {hitRegion} from '../src/breach-wounds.ts';
import {newSession} from '../src/breach-game.ts';
import {initialRoster,applyRosterIdentity} from '../src/breach-roster.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

test('armor applies only to equipped coverage and directional hit location',()=>{
 const kit=setEquipmentChoice(initialEquipmentLoadout(),'armor','armor-carrier');
 const start=initialArmorIntegrity(kit);
 assert.deepEqual(start,{torso:8,head:5});
 const input={kit,region:'torso',incomingYaw:Math.PI,
  targetHeading:0,penetration:.1,severity:1,shotId:4,...start};
 const front=resolveArmorImpact(input);
 assert.equal(front.covered,true);
 assert.equal(front.torso,7);
 const side=resolveArmorImpact({...input,incomingYaw:Math.PI/2});
 assert.equal(side.covered,false);
 assert.equal(side.torso,8);
 const arm=resolveArmorImpact({...input,region:'arm'});
 assert.equal(arm.covered,false);
 const head=resolveArmorImpact({...input,region:'head'});
 assert.equal(head.covered,true);
 assert.equal(head.head,4);
 const none=resolveArmorImpact({...input,kit:initialEquipmentLoadout(),
  torso:0,head:0});
 assert.equal(none.covered,false);
});
test('armor is finite and impact calculations are reproducible',()=>{
 const kit=setEquipmentChoice(initialEquipmentLoadout(),'armor','armor-soft');
 const input={kit,region:'torso',incomingYaw:Math.PI,
  targetHeading:0,penetration:.4,severity:2,shotId:1,torso:5,head:5};
 assert.deepEqual(resolveArmorImpact(input),resolveArmorImpact(input));
 assert.equal(resolveArmorImpact({...input,torso:0}).covered,false);
 assert.ok(Array.from({length:100},(_,i)=>hitRegion(i)).includes('head'));
});
test('armor is issued on deployment and captured in replay film',()=>{
 const s=newSession(),roster=initialRoster();
 applyRosterIdentity(s,roster);
 const rook=s.operators.find(a=>a.id==='rook');
 assert.ok(rook.armorIntegrity>0);
 assert.ok(rook.helmetIntegrity>0);
 const frame=snapshot(s);
 rook.armorIntegrity=0;
 applyReplayFrame(s,frame);
 assert.equal(rook.armorIntegrity,frame.actors.find(a=>a.id==='rook').armorIntegrity);
});
