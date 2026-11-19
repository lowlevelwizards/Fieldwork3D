import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('physical layout copies use distinct authorized Campaign and roster commit callbacks',()=>{
 const ops=read('breach-operations-board-controller.ts');
 const camp=read('campaign-ui.ts');
 const flow=read('breach-campaign-flow.ts');
 assert.match(ops,/onCopyLayout:targetId=>/);
 assert.match(ops,/copyRosterCarryLayout\(before,current.id,targetId\)/);
 assert.match(camp,/onCopyLayout:targetId=>/);
 assert.match(camp,/this.handlers.copyCarryLayout\(id,targetId\)/);
 assert.match(flow,/copyCampaignCarryLayout\(c,sourceId,targetId\)/);
});
