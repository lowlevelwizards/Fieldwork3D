import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const legacy=readFileSync(new URL('breach.html',root),'utf8');
const code=readFileSync(new URL('src/breach-main.ts',root),'utf8');

test('canonical tactical page satisfies the controller DOM contract',()=>{
 const start=code.indexOf('const ui={');
 const end=code.indexOf('};\nfor(const key',start);
 assert.ok(start>=0 && end>start,'Cannot find UI contract');
 const required=[...code.slice(start,end).matchAll(/el<[^>]+>\('([^']+)'\)/g)]
  .map(match=>match[1]);
 assert.ok(required.length>40,'No complete UI contract found');
 for(const id of required){
  assert.ok(html.includes('id="'+id+'"'),'Missing tactical UI id: '+id);
 }
});
test('legacy tactical page aliases the canonical page without losing query data',()=>{
 assert.ok(legacy.includes("new URL('./index.html',window.location.href)"));
 assert.ok(legacy.includes('target.search=window.location.search'));
 assert.ok(legacy.includes('target.hash=window.location.hash'));
 assert.ok(legacy.includes('window.location.replace(target.href)'));
 assert.ok(!legacy.includes('src="./src/breach-main.ts"'));
});
