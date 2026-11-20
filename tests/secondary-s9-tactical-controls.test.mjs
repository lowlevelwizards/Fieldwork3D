import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,reloadNow}
 from '../src/breach-game.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {plannedSecondaryHand,requestSecondarySwitch,
 advanceSecondarySwitch,initialSecondarySwitch} from '../src/secondary-switching.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';

const base={door:false,node:false,posture:'stand',pace:'walk',
 firePolicy:'engage',reserve:12,magazine:8,flashRemaining:2};
test('S9: draw/holster is absent without issuance and respects authored waypoint hand',()=>{
 const empty=contextActionChoices(base);
 assert.equal(empty.some(x=>x.id==='ctxSwitchWeapon'),false);
 const issued=contextActionChoices({...base,secondaryIssued:true,
  secondaryHand:'primary'});
 assert.equal(issued.find(x=>x.id==='ctxSwitchWeapon')?.label,'DRAW SIDEARM');
 const held=contextActionChoices({...base,secondaryIssued:true,
  secondaryHand:'secondary',secondaryReloadAvailable:false});
 assert.equal(held.find(x=>x.id==='ctxSwitchWeapon')?.label,'HOLSTER SIDEARM');
 assert.equal(held.find(x=>x.id==='ctxReload')?.disabled,true);
 const spare=contextActionChoices({...base,secondaryIssued:true,
  secondaryHand:'secondary',secondaryReloadAvailable:true});
 assert.equal(spare.find(x=>x.id==='ctxReload')?.disabled,false);
});
test('S9: one contextual dispatcher adds paired draw/holster as real undoable plan orders',()=>{
 const s=newSession(),a=team(s)[0];
 a.equipment={...initialEquipmentLoadout(),
  secondary:initialSecondaryEquipment(a.id,'glock-g19-gen3')};
 const submit=(node)=>dispatchTacticalContextCommand({state:s,selected:a.id,
  actor:a,node,door:undefined,selectedActiveWatch:false,
  action:'ctxSwitchWeapon',medicalCandidate:()=>null});
 assert.equal(plannedSecondaryHand(a.secondarySwitch,a.plan), 'primary');
 assert.equal(submit(undefined).outcome,'accepted');
 assert.equal(a.plan[0].kind,'switch-weapon');
 assert.equal(a.plan[0].weaponHand,'secondary');
 assert.equal(plannedSecondaryHand(a.secondarySwitch,a.plan,a.plan[0].id),'secondary');
 assert.equal(submit(a.plan[0]).outcome,'accepted');
 assert.equal(a.plan.length,2);
 assert.equal(a.plan[1].weaponHand,'primary');
 assert.equal(plannedSecondaryHand(a.secondarySwitch,a.plan,a.plan[1].id),'primary');
});
test('S9: running reloadNow cannot silently reload an invisible rifle while the Glock is selected',()=>{
 const s=newSession(),a=team(s)[0];
 const kit=initialSecondaryEquipment(a.id,'glock-g19x');
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 a.magazine=0;
 s.phase='running';
 let sw=requestSecondarySwitch(initialSecondarySwitch(),'secondary',kit).state;
 for(let i=0;i<60;i++)sw=advanceSecondarySwitch(sw,1/60,kit);
 a.secondarySwitch=sw;
 const before={mag:a.magazine,res:a.reserve,loaded:kit.loadedRounds};
 assert.equal(reloadNow(s,a.id),false);
 assert.equal(a.magazine,before.mag);
 assert.equal(a.reserve,before.res);
 assert.equal(a.equipment.secondary.loadedRounds,before.loaded);
});
