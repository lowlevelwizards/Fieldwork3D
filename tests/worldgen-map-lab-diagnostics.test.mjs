import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Map Lab diagnostics expose physical door markers and restore authoritative site after audit',()=>{
 const lab=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
 assert.match(html,/id="doors"/);
 assert.ok(lab.includes("auditGeneratedSite(site.seed,site.scale??'standard')"));
 assert.match(lab,/activateSite\(site\)/);
 assert.match(lab,/result.errors.length/);
});
