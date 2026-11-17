import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('creator cancel returns to experience picker without changing campaign save ownership',()=>{
 const ui=source('campaign-ui.ts');
 assert.match(ui,/initialPane:'main'\|'new'='main'/);
 assert.match(ui,/if\(initialPane==='new'&&creationLauncher\)openNew\(creationLauncher\)/);
 assert.match(ui,/onCancel:\(\)=>this\.entry\(this\.lastEntry\.legacy,this\.lastEntry\.sandbox,\s*this\.lastEntry\.active,this\.lastEntry\.dispatch,'new'\)/);
 assert.match(ui,/if\(!selected\)creationLauncher=primary/);
});

test('Dispatch creator uses accessible radio cards and preserves validated rule authority',()=>{
 const ui=source('ui/dispatch-campaign-creator.ts');
 assert.match(ui,/input\.type='radio'/);
 assert.match(ui,/input\.name='dispatch-experience'/);
 assert.match(ui,/DISPATCH_PRESETS/);
 assert.match(ui,/dispatchPresetDraft\(chosenPreset\(\)\)/);
 assert.match(ui,/createDispatchSetup\(draft\)/);
 assert.match(ui,/dispatchCreationReview\(draft\)/);
 assert.match(ui,/CUSTOMIZE CAMPAIGN RULES/);
 assert.match(ui,/FULL RULE REVIEW/);
 assert.match(ui,/options\.hasDispatch/);
 assert.match(ui,/options\.onExport/);
 assert.match(ui,/if\(submitting\)return/);
});

test('Classic Sandbox separates working settings, advanced seed and save protection',()=>{
 const ui=source('ui/campaign-creator.ts');
 assert.match(ui,/MAP INTELLIGENCE/);
 assert.match(ui,/MAP SCALE/);
 assert.match(ui,/ADVANCED · REPRODUCIBLE SEED/);
 assert.match(ui,/WHAT PERSISTS\?/);
 assert.match(ui,/validateCampaignDraft\(draft\)/);
 assert.match(ui,/options\.hasSandbox/);
 assert.match(ui,/options\.onExportSandbox/);
 assert.doesNotMatch(ui,/FUTURE CAMPAIGN FRAMEWORKS/);
});
