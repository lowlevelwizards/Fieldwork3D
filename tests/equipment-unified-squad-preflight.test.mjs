import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {initialRoster,applyRosterIdentity} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {quoteSavedCarryMigration} from '../src/equipment-unified-preparation.ts';
function outfit(op){
 let kit=initialEquipmentLoadout(op.weapon);
 for(const [slot,id] of [['rig','rig-none'],['armor','armor-none'],['belt','belt-padded'],['backpack','backpack-day'],['medical','medical-none'],['utility','utility-none']])kit=setEquipmentChoice(kit,slot,id);
 kit.fieldInventory={version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'}]};
 return {...op,loadout:kit,wardrobe:undefined,magazines:[],reserve:0};
}
test('BT12 staged squad deployment computes all fits before modifying any actor',()=>{
 const s=newSession(),r=initialRoster(),members=r.members.map(outfit);
 const before=team(s).map(a=>({id:a.id,equipment:structuredClone(a.equipment),weapon:a.weapon,name:a.name,flashCharges:a.flashCharges,manifest:a.unifiedCarry}));
 const invalid=members.at(-1);
 invalid.loadout=setEquipmentChoice(setEquipmentChoice(invalid.loadout,'belt','belt-none'),'backpack','backpack-none');
 assert.throws(()=>applyRosterIdentity(s,{...r,members},'unified'),/UNIFIED CARRY DOES NOT FIT/);
 assert.deepEqual(team(s).map(a=>({id:a.id,equipment:a.equipment,weapon:a.weapon,name:a.name,flashCharges:a.flashCharges,manifest:a.unifiedCarry})),before);
});
test('BT12 staged valid squad deploys as one authority and keeps save stock detached',()=>{
 const s=newSession(),r=initialRoster(),members=r.members.map(outfit),before=structuredClone(members);
 for(const m of members)assert.equal(quoteSavedCarryMigration(m).ok,true,m.id);
 applyRosterIdentity(s,{...r,members},'unified');
 for(const a of team(s)){assert.ok(a.unifiedCarry,a.id);assert.equal(a.flashCharges,1);}
 assert.deepEqual(members,before);
});
