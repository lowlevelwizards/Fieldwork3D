import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V5.1: mission summary is reversible and saved on replay return',()=>{
 const html=read('index.html'),ui=read('src/ui/breach-after-action-controller.ts');
 assert.match(html,/id="afterActionSummaryToggle"/);
 assert.match(ui,/summaryCompact:s.summaryCompact/);
 assert.match(ui,/s.summaryCompact=context.summaryCompact/);
 assert.match(ui,/current.summaryCompact=!current.summaryCompact/);
 assert.match(html,/id="debriefGrade"/);
});
test('V5.1: segmented tabs and one preexisting body scroll owner survive',()=>{
 const html=read('index.html'),css=read('src/breach-style.css');
 assert.match(html,/id="afterActionBody"/);
 assert.match(html,/data-after-tab="combat"/);
 assert.match(css,/fw-v5-summary-compact/);
 assert.match(css,/fw-v5-workspace .fw-after-tabs button\[aria-pressed="true"\]/);
});
