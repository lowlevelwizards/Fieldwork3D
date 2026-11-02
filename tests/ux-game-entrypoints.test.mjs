import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const legacy=readFileSync(new URL('breach.html',root),'utf8');
const code=readFileSync(new URL('src/breach-main.ts',root),'utf8');
test('canonical tactical entry contains each required UI target',()=>{
 const contract=code.slice(code.indexOf('const ui={'),code.indexOf('};\\nfor(const key',code.indexOf('const ui={')));
 const required=[...contract.matchAll(/el<[^>]+>\\('([^']+)'\\)/g)].map(m=>m[1]);
 assert.ok(required.length>40,'Did not find tactical UI contract');
 for(const id of required)assert.match(html,new RegExp('\\\\bid=["\\']'+id+'["\\']'),
  'Canonical tactical page must contain '+id);
});
test('legacy breach entry redirects with URL params preserved',()=>{
 assert.match(legacy,/new URL\\('\.\\/index\.html'/);
 assert.match(legacy,/target\.search=window\.location\.search/);
 assert.match(legacy,/target\.hash=window\.location\.hash/);
 assert.match(legacy,/location\.replace\\(target\.href\\)/);
 assert.doesNotMatch(legacy,/src="\.\\/src\\/breach-main\.ts"/);
});
