import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('26.04b main and standalone Breach boot use the same required lighting control',()=>{
 for(const name of ['index.html','breach.html']){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.equal((source.match(/id="siteLighting"/g)??[]).length,1,name);
  assert.match(source,/id="siteSettings"/,name);
 }
});
