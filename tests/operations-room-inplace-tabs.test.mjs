import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Operations Room switches already-built tab panels without rebuilding campaign state',()=>{
 const ui=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const start=ui.indexOf(' home(c:CampaignState,slot?:CampaignSlot){');
 const end=ui.indexOf(' private armory(c:CampaignState,id:string){',start);
 const home=ui.slice(start,end);
 assert.match(home,/const activateTab=\(tab:typeof tabOrder\[number\]\)=>/);
 assert.match(home,/panel\.hidden=id!==tab/);
 assert.match(home,/trigger\.setAttribute\('aria-selected',String\(selected\)\)/);
 assert.match(home,/trigger\.tabIndex=selected\?0:-1/);
 assert.match(home,/tabs\[next\]\.focus\(\{preventScroll:true\}\)/);
 assert.match(home,/this\.root\.scrollTop=0/);
 assert.match(home,/activateTab\(check\.action\)/);
 assert.match(home,/activateTab\(tab\)/);
 assert.doesNotMatch(home,/this\.homeTab=tab;this\.root\.scrollTop=0;this\.home\(c\)/);
});
