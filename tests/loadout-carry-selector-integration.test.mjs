import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('Campaign and Quick Play selectors use shared quote then atomic owner commit',()=>{
 const ops=read('breach-operations-board-controller.ts');
 const campaign=read('campaign-ui.ts');
 const flow=read('breach-campaign-flow.ts');
 assert.match(ops,/attachCarryGearChangePreview\(/);
 assert.match(ops,/equipRosterCarryGear\(prior,member.id,slot,itemId\)/);
 assert.match(campaign,/attachCarryGearChangePreview\(/);
 assert.match(campaign,/this.handlers.equipCarryGear\(id,slot,itemId\)/);
 assert.match(flow,/equipCampaignCarryGear\(c,id,slot,itemId\)/);
 assert.match(campaign,/if\(slot!=='rig'&&slot!=='belt'&&slot!=='backpack'\)/);
 assert.match(ops,/if\(slot!=='rig'&&slot!=='belt'&&slot!=='backpack'\)/);
});
