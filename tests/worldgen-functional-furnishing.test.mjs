import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('essential bathroom and clinic furniture use functional equipment rather than placeholders',()=>{
 const src=readFileSync(new URL('../src/worldgen/room-furnishing.ts',import.meta.url),'utf8');
 for(const [purpose,item] of [['bathroom','toilet'],['restroom','toilet'],
   ['exam','exam-bed'],['treatment','exam-bed'],['kitchen','stove']]){
  const composition=src.split('\n').find(line=>line.trim().startsWith(purpose+':['));
  assert.ok(composition?.includes("id:'"+item+"'"),purpose);
  assert.ok(propDefinition(item)?.solid,item);
 }
 assert.match(src,/const compact=room.w<108\|\|room.h<104/);
});
test('functional furnishings remain deterministic and physically navigable on both property sizes',()=>{
 for(let seed=1;seed<=22;seed++)for(const size of ['standard','expanded']){
  const site=generateSite(seed,size);
  assert.deepEqual(site.cover,generateSite(seed,size).cover);
  const audit=auditGeneratedSite(seed,size);
  assert.deepEqual(audit.errors,[],size+' '+seed+': '+audit.errors.join(','));
 }
});
