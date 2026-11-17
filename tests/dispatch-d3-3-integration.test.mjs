import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign} from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {applyStudioCampaignEdits} from '../src/operator-studio-batch-save.ts';
import {applyHistoricalCampaignProposal}
 from '../src/faction-reference-loadout-apply.ts';
import {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}
 from '../src/arsenal/campaign-adapter.ts';

const src=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('D3.3 direct Studio and historical-loadout campaign bypasses fail closed',()=>{
 const pilot=newDispatchPilotCampaign(404),member=pilot.operators[0];
 const appearance={id:member.id,wardrobe:{...member.wardrobe,
  styles:{...member.wardrobe.styles,top:'polo-shirt'}}};
 // D6 permits narrow cosmetics but still blocks unsupported uniform cuts.
 assert.equal(applyStudioCampaignEdits(pilot,[appearance]),null);
 assert.equal(applyHistoricalCampaignProposal(pilot,member.id,{}),null);
 const old=newCampaign(405);
 assert.notEqual(applyStudioCampaignEdits(old,[{
  id:old.operators[0].id,wardrobe:old.operators[0].wardrobe
 }]),null);
});

test('D3.3 Arsenal adapter rejects Dispatch at quote and commit boundaries',()=>{
 const pilot=newDispatchPilotCampaign(440),member=pilot.operators[0];
 const d=quoteCampaignArsenalEdit(pilot,member.id,{});
 assert.equal(d.valid,false);
 assert.equal(d.canCommit,false);
 assert.match(d.reason,/Dispatch pilot/);
 const write=commitCampaignArsenalEdit(pilot,member.id,{});
 assert.equal(write.state,pilot);
 assert.equal(write.quote.canCommit,false);
});

test('D3.3 menu and runtime route Dispatch without changing Quick Play contracts',()=>{
 const main=src('breach-main.ts'),ui=src('campaign-ui.ts'),
  flow=src('breach-campaign-flow.ts'),state=src('campaign-state.ts');
 assert.match(ui,/CONTINUE DISPATCH/);
 assert.match(ui,/DISPATCH CAMPAIGN/);
 assert.match(ui,/Choose a tactical-police career/);
 assert.match(main,/campaignInSlot\('dispatch'\)/);
 assert.match(flow,/newDispatchPilotCampaign\(config.randomSeed\(\)\)/);
 assert.match(flow,/continueDispatch:\(\)=>resumeSlot\('dispatch'\)/);
 assert.match(state,/mayChooseCampaignContent\(c,'equipment',itemId,slot\)/);
 assert.match(state,/mayChooseCampaignContent\(c,'weapon-preset',presetId\)/);
 assert.doesNotMatch(src('breach-quickplay-controller.ts'),
  /dispatch-campaign-eligibility|dispatch-content-policy/);
});
