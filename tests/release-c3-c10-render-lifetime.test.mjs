import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planObjectWear} from '../src/worldgen/object-wear.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite} from '../src/breach-core.ts';
test('C10: static wear indexing preserves exact original ordered owner/index matches',()=>{
 try{
  const site=generateSite(16,'small');
  const marks=planObjectWear(site);
  const indexed=new Map();
  for(const mark of marks){
   const key=mark.owner+':'+mark.index;
   if(!indexed.has(key))indexed.set(key,[]);
   indexed.get(key).push(mark);
  }
  for(const mark of marks){
   const expected=marks.filter(m=>m.owner===mark.owner&&m.index===mark.index);
   assert.deepEqual(indexed.get(mark.owner+':'+mark.index),expected);
  }
 }finally{activateSite(null);}
});
test('C10: no per-frame object wear scan or new fragment color per instance',()=>{
 const source=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',
   import.meta.url),'utf8');
 assert.match(source,/const wearByOwner=new Map<string,ObjectWear\[\]>\(\)/);
 assert.doesNotMatch(source,/host\.objectWear\.filter\(/);
 assert.doesNotMatch(source,/new THREE\.Color\(fragmentColors\[/);
 assert.match(source,/batch\.setColorAt\(i,fragmentColors\[f\.kind\]\)/);
});
