import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('expanded property control and Map Lab links survive game entry and replay',()=>{
 for(const html of ['index.html','breach.html'])assert.match(read(html),/id="siteSize"/);
 const src=read('src/breach-main.ts');
 assert.match(src,/requestedSiteScale/);
 assert.match(src,/ui\.siteSize\.addEventListener\('click'/);
 assert.match(src,/finishedSession\.site\?\.scale\?\?'standard'/);
 assert.match(src,/selectedIntelMode,requestedSiteScale\)/);
 assert.match(src,/startupParams\.get\('scale'\)/);
});
