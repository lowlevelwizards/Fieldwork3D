import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,planWait,planSwitchWeaponAt} from '../src/breach-game.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {executeTacticalUtilityOrder}
 from '../src/breach-order-utility.ts';
import {initialSecondarySwitch} from '../src/secondary-switching.ts';

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
 assert.match(protectedCode,/a.secondarySwitch.fraction>0/);
 assert.match(protectedCode,/a.secondarySwitch.desired==='secondary'/);
});
