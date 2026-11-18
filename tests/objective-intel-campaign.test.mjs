import test from 'node:test';
import assert from 'node:assert/strict';
import {createObjectiveKnowledge,objectiveLocationKnown,objectiveIntelDescription,
 setObjectiveIntelLevel,discoverObjective} from '../src/breach-objective-intel.ts';
import {defaultQuickPlaySettings,resolveQuickPlaySettings}
 from '../src/quick-play-settings.ts';
import {newCampaign,readCampaign,reconContract,campaignIntelBalance,
 contractObjectiveIntel} from '../src/campaign-state.ts';
import {objectiveEntryTopology,chooseTopologyAwareObjective}
 from '../src/worldgen/objective-entry-topology.ts';

const rooms=[
 {id:'entry',x:0,y:0,w:100,h:100,kind:'room',purpose:'lobby',tone:0},
 {id:'middle',x:100,y:0,w:100,h:100,kind:'room',purpose:'office',tone:0},
 {id:'rear',x:200,y:0,w:100,h:100,kind:'room',purpose:'storage',tone:0}
];
const door=(id,x)=>({id,a:{x,y:30},b:{x,y:70},open:false,openedAt:-1});
const doors=[door('FRONT',0),door('D1',100),door('D2',200)];
const site={seed:7,rooms,objective:{x:250,y:50},entrance:{x:-30,y:50}};
test('objective knowledge is independent of architectural full view and persists after observation',()=>{
 const state={site,objectiveIntel:createObjectiveKnowledge(site,'unknown'),
  intel:{mode:'full-view'}};
 assert.equal(objectiveLocationKnown(state),false);
 assert.match(objectiveIntelDescription(state),/UNKNOWN/);
 setObjectiveIntelLevel(state,'approximate');
 assert.ok(state.objectiveIntel.area?.roomIds.length>=3);
 assert.equal(objectiveLocationKnown(state),false);
 assert.equal(discoverObjective(state,false),false);
 assert.equal(discoverObjective(state,true),true);
 assert.equal(objectiveLocationKnown(state),true);
 setObjectiveIntelLevel(state,'unknown');
 assert.equal(objectiveLocationKnown(state),true,'known fact never forgotten on respec');
 assert.equal(objectiveLocationKnown({objectiveIntel:createObjectiveKnowledge(site,'confirmed')}),true);
});
test('Quick Play defaults to searching; Random intelligence is reproducible',()=>{
 const settings=defaultQuickPlaySettings();
 assert.equal(settings.objectiveIntel,'unknown');
 const resolved=resolveQuickPlaySettings(settings,1029);
 assert.equal(resolved.objectiveIntel,'unknown');
 const random={...settings,objectiveIntel:'random'};
 const first=resolveQuickPlaySettings(random,1029);
 assert.equal(first.objectiveIntel,resolveQuickPlaySettings(random,1029).objectiveIntel);
 assert.ok(['unknown','approximate','confirmed'].includes(first.objectiveIntel));
});
test('campaign recon spends bounded resource, escalates knowledge and survives older saves',()=>{
 const campaign=newCampaign(121);
 assert.equal(campaignIntelBalance(campaign),1);
 const target=campaign.contracts.find(c=>c.status==='available');
 assert.ok(target);
 assert.equal(contractObjectiveIntel(target),'unknown');
 const upgraded=reconContract(campaign,target.id);
 assert.notEqual(upgraded,campaign);
 assert.equal(campaignIntelBalance(upgraded),0);
 assert.equal(contractObjectiveIntel(upgraded.contracts.find(c=>c.id===target.id)),
  'approximate');
 assert.equal(reconContract(upgraded,target.id),upgraded,
  'insufficient balance must not cause duplicate charges');
 assert.equal(campaignIntelBalance(campaign),1,'original state remains immutable');
 const read=readCampaign(JSON.stringify(upgraded));
 assert.ok(read);
 assert.equal(contractObjectiveIntel(read.contracts.find(c=>c.id===target.id)),
  'approximate');
 const old={...campaign};
 delete old.intelligence;
 old.contracts=old.contracts.map(({objectiveIntel,...rest})=>rest);
 assert.ok(readCampaign(JSON.stringify(old)),'pre-upgrade saves remain valid');
 const earned={...upgraded,intelligence:3};
 const confirmed=reconContract(earned,target.id);
 assert.equal(contractObjectiveIntel(confirmed.contracts.find(c=>c.id===target.id)),
  'confirmed');
 assert.equal(campaignIntelBalance(confirmed),1);
 assert.equal(reconContract(confirmed,target.id),confirmed);
});
test('all physical door entries are considered in room transitions, not just front distance',()=>{
 const topology=objectiveEntryTopology(rooms,doors,[],{x:-30,y:50},13,'intel');
 const byId=Object.fromEntries(topology.map(c=>[c.roomId,c]));
 assert.equal(byId.entry.entryTransitions,1);
 assert.equal(byId.middle.entryTransitions,2);
 assert.equal(byId.rear.entryTransitions,3);
 assert.equal(byId.entry.directExterior,true);
 const extra=objectiveEntryTopology(rooms,[...doors,door('SIDE',300)],[],
  {x:-30,y:50},13,'intel');
 const byExtra=Object.fromEntries(extra.map(c=>[c.roomId,c]));
 assert.equal(byExtra.rear.entryTransitions,1,'secondary door prevents artificial depth');
 const p=chooseTopologyAwareObjective(rooms,doors,[],{x:-30,y:50},
  13,'intel',[],{x:50,y:50});
 assert.ok(rooms.some(r=>r.x+r.w/2===p.x&&r.y+r.h/2===p.y));
});
