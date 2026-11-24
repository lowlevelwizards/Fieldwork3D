import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Operations Room switches already-built tab panels without rebuilding campaign state',()=>{
 const ui=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const start=ui.indexOf(' home(c:CampaignState,slot?:CampaignSlot){');
 const end=ui.indexOf(' private armory(c:CampaignState,id:string){',start);
 const home=ui.slice(start,end);
 const tabs=readFileSync(new URL('../src/ui/campaign/home-tabs.ts',import.meta.url),'utf8');
 assert.match(home,/createCampaignHomeTabs\(this\.root,sections,this\.homeTab/);
 assert.match(tabs,/const activateTab=\(tab:CampaignHomeTab\)=>/);
 assert.match(tabs,/panel\.hidden=id!==tab/);
 assert.match(tabs,/trigger\.setAttribute\('aria-selected',String\(selected\)\)/);
 assert.match(tabs,/trigger\.tabIndex=selected\?0:-1/);
 assert.match(tabs,/tabs\[next\]\.focus\(\{preventScroll:true\}\)/);
 assert.match(tabs,/root\.scrollTop=0/);
 assert.match(home,/activateTab\(destination\)/);
 assert.match(tabs,/activateTab\(tab\)/);
 assert.doesNotMatch(home,/this\.homeTab=tab;this\.root\.scrollTop=0;this\.home\(c\)/);
});

test('Operations Room prioritizes deployment and groups administrative utilities',()=>{
 const ui=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const home=ui.slice(ui.indexOf(' home(c:CampaignState,slot?:CampaignSlot){'),
  ui.indexOf(' private armory(c:CampaignState,id:string){'));
 assert.match(home,/BROWSE CONTRACTS/);
 assert.match(home,/campaign-overview-primary-action/);
 assert.match(home,/SAVES & OTHER MODES/);
 assert.match(home,/utilityContent\.append\(/);
 assert.match(home,/this\.importPicker\(\)/);
 assert.match(home,/this\.handlers\.exportSave/);
 assert.match(home,/this\.handlers\.quickPlay/);
});
