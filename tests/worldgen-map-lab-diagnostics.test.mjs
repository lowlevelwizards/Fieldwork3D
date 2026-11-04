import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Map Lab audits authoritative generated sites off-thread and shows physical door markers',()=>{
 const lab=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/map-lab-worker.ts',import.meta.url),'utf8');
 const audit=readFileSync(new URL('../src/breach-site-audit.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
 assert.match(html,/id="doors"/);
 assert.match(lab,/new Worker\(new URL\('\.\/map-lab-worker\.ts'/);
 assert.match(worker,/const audit=auditSite\(site\)/);
 assert.match(worker,/post\(\{kind:'done',site,audit/);
 assert.match(audit,/activateSite\(site\)/);
 assert.match(audit,/finally\s*\{\s*activateSite\(null\);?\s*\}/);
 assert.match(lab,/result\.errors\.length/);
});
