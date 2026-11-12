import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V6.2 squad overview surfaces injury context without changing weighted score',()=>{
 const ui=source('src/ui/breach-after-action-squad.ts');
 assert.match(ui,/squadCondition\(operators\)/);
 assert.match(ui,/HEAVILY WOUNDED/);
 assert.match(ui,/INCAPACITATED/);
 assert.match(ui,/evidenceTime\(entry\.at\)/);
 assert.match(ui,/inspect\(entry\.sourceKey\)/);
 const score=source('src/breach-after-action-report.ts');
 assert.match(score,/contribution:combat\+recon\+support\+objective/);
});
test('V6.2 mission details preserve severe wounds and explain cap as cap',()=>{
 const ui=source('src/ui/breach-after-action-mission-details.ts');
 assert.match(ui,/a\.injury>=2\?'HEAVILY WOUNDED'/);
 assert.match(ui,/SCORE CAPPED AT 100/);
 assert.match(ui,/String\(stats\.score-component\.amount\)/);
 assert.match(ui,/stats\.scoreComponents/);
});
